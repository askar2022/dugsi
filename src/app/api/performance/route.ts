import { NextRequest } from "next/server";
import { ASSESSMENT_CLASS_LEVEL, ASSESSMENT_CLASS_NAME } from "@/lib/assessment-class";
import { ApiError, handleApiError, teacherAssignedClassIds } from "@/lib/guard";
import { json } from "@/lib/http";
import {
  arrivalScore,
  attendanceScore,
  average,
  completionFollowedUp,
  homeworkAssignedToStudent,
  homeworkFollowUp,
  inWindow,
  percent,
  quranOwnGoalScore,
  ratingFromScore,
  weekRanges,
  windowRange,
} from "@/lib/performance";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuthedTenant, throwIfError } from "@/lib/supabase/request";

type StudentRow = {
  id: string;
  firstName: string;
  lastName: string;
  status: string;
  parentId: string | null;
  classId: string | null;
};

export async function GET(request: NextRequest) {
  try {
    const { supabase, session } = await requireAuthedTenant(request, ["ADMIN", "STAFF", "TEACHER"]);
    const assignedClassIds = await teacherAssignedClassIds(supabase, session);
    if (assignedClassIds && assignedClassIds.length === 0) {
      return json({ window: windowRange(), school: null, classes: [], families: [] });
    }

    const url = new URL(request.url);
    const classId = url.searchParams.get("classId");
    const parentId = url.searchParams.get("parentId");
    if (assignedClassIds && classId && !assignedClassIds.includes(classId)) {
      throw new ApiError("You can only see your own class.", 403);
    }
    if (session.role === "TEACHER" && parentId) {
      throw new ApiError("Family ratings stay with the office.", 403);
    }

    const admin = createAdminClient();
    const { start, end } = windowRange();
    const [studentsRes, classesRes, progressRes, attendanceRes, homeworkRes, parentsRes] = await Promise.all([
      admin.from("Student").select("id, firstName, lastName, status, parentId, classId").eq("tenantId", session.tenantId),
      admin.from("Class").select("id, name, level, teacherId, teacher:User!teacherId(id, name)").eq("tenantId", session.tenantId),
      admin.from("QuranProgress").select("id, studentId, surah, ayahFrom, ayahTo, juz, date, status").eq("tenantId", session.tenantId),
      admin.from("Attendance").select("studentId, classId, date, status").eq("tenantId", session.tenantId).gte("date", start).lte("date", end),
      admin
        .from("Homework")
        .select("id, classId, studentId, assignedDate, completions:HomeworkCompletion(studentId, status)")
        .eq("tenantId", session.tenantId)
        .gte("assignedDate", start)
        .lte("assignedDate", end),
      admin.from("User").select("id, name").eq("tenantId", session.tenantId).eq("role", "PARENT"),
    ]);
    for (const result of [studentsRes, classesRes, progressRes, attendanceRes, homeworkRes, parentsRes]) {
      throwIfError(result.error, "Could not load performance.");
    }

    const holdingIds = new Set(
      (classesRes.data ?? [])
        .filter((item) => item.level === ASSESSMENT_CLASS_LEVEL || item.name === ASSESSMENT_CLASS_NAME)
        .map((item) => item.id),
    );
    const students = ((studentsRes.data ?? []) as StudentRow[]).filter((student) =>
      student.status === "enrolled" && student.classId && !holdingIds.has(student.classId),
    );
    const classes = (classesRes.data ?? []).filter((item) => !holdingIds.has(item.id));
    const allowedClassIds = assignedClassIds ? new Set(assignedClassIds) : null;
    const visibleStudents = students.filter((student) => !allowedClassIds || (student.classId && allowedClassIds.has(student.classId)));
    const visibleClasses = classes.filter((item) => !allowedClassIds || allowedClassIds.has(item.id));

    const progressByStudent = new Map<string, Array<{
      id: string;
      surah: string;
      ayahFrom: number;
      ayahTo: number;
      juz: number | null;
      date: string;
      status?: string | null;
    }>>();
    for (const row of progressRes.data ?? []) {
      const list = progressByStudent.get(row.studentId) ?? [];
      list.push(row);
      progressByStudent.set(row.studentId, list);
    }

    const attendanceByStudent = new Map<string, Array<{ classId: string; date: string; status: string }>>();
    for (const row of attendanceRes.data ?? []) {
      const list = attendanceByStudent.get(row.studentId) ?? [];
      list.push(row);
      attendanceByStudent.set(row.studentId, list);
    }

    const homework = homeworkRes.data ?? [];
    const parentNames = new Map((parentsRes.data ?? []).map((item) => [item.id, item.name]));

    function studentScore(student: StudentRow, rangeStart = start, rangeEnd = end, requiredQuran = false) {
      const quran = quranOwnGoalScore(progressByStudent.get(student.id) ?? [], rangeStart, rangeEnd, requiredQuran);
      const marks = (attendanceByStudent.get(student.id) ?? []).filter((row) => inWindow(row.date, rangeStart, rangeEnd));
      const attend = attendanceScore(marks);
      const arrive = arrivalScore(marks);
      const assignedWork = homework.filter((item) =>
        inWindow(item.assignedDate, rangeStart, rangeEnd) && homeworkAssignedToStudent(item, student),
      );
      const reviewed = assignedWork.filter((item) =>
        (item.completions ?? []).some((row) => row.studentId === student.id && completionFollowedUp(row.status)),
      ).length;
      const done = assignedWork.filter((item) =>
        (item.completions ?? []).some((row) => row.studentId === student.id && row.status === "done"),
      ).length;
      const work = homeworkFollowUp(assignedWork.length, reviewed, done);
      const classScore = average([quran, attend.score, work.score]);
      const familyScore = average([arrive.score, work.score]);
      return {
        quran,
        attend,
        arrive,
        work,
        classScore,
        familyScore,
        rating: ratingFromScore(classScore),
        familyRating: ratingFromScore(familyScore),
      };
    }

    const scored = visibleStudents.map((student) => ({ student, ...studentScore(student, start, end, true) }));
    const weeks = weekRanges(end);

    const classCards = visibleClasses.map((klass) => {
      const kids = scored.filter((row) => row.student.classId === klass.id);
      const rated = kids.filter((row) => row.classScore != null);
      const onTrack = rated.filter((row) => (row.classScore ?? 0) >= 80).length;
      const support = rated.filter((row) => (row.classScore ?? 0) < 60).length;
      const attention = Math.max(0, kids.length - onTrack - support);
      const onTrackPct = percent(onTrack, kids.length);
      const needsSupportPct = percent(support, kids.length);
      const score = onTrackPct;
      const homeworkAssigned = kids.reduce((sum, row) => sum + row.work.assigned, 0);
      const homeworkReviewed = kids.reduce((sum, row) => sum + row.work.reviewed, 0);
      const attendanceDays = new Set(
        kids.flatMap((row) => (attendanceByStudent.get(row.student.id) ?? []).filter((mark) => mark.classId === klass.id).map((mark) => mark.date)),
      ).size;
      const trend = weeks.map((week) => {
        const weekKids = kids.map((row) => studentScore(row.student, week.start, week.end)).filter((row) => row.classScore != null);
        const weekOnTrack = weekKids.filter((row) => (row.classScore ?? 0) >= 80).length;
        return {
          start: week.start,
          end: week.end,
          onTrackCount: weekOnTrack,
          total: weekKids.length,
          onTrackPct: percent(weekOnTrack, weekKids.length),
        };
      });
      const teacher = Array.isArray(klass.teacher) ? klass.teacher[0] : klass.teacher;
      return {
        id: klass.id,
        name: klass.name,
        teacherId: klass.teacherId,
        teacherName: teacher?.name ?? "No teacher yet",
        students: kids.length,
        onTrackCount: onTrack,
        attentionCount: attention,
        supportCount: support,
        onTrackPct,
        needsSupportPct,
        score,
        rating: ratingFromScore(score),
        homeworkAssigned,
        homeworkReviewed,
        attendanceDays,
        trend,
      };
    }).sort((a, b) => (a.score ?? 101) - (b.score ?? 101));

    const familyCards = session.role === "TEACHER"
      ? []
      : [...new Set(visibleStudents.map((student) => student.parentId).filter((id): id is string => Boolean(id)))].map((id) => {
        const kids = scored.filter((row) => row.student.parentId === id);
        const marks = kids.flatMap((row) => attendanceByStudent.get(row.student.id) ?? []);
        const arrive = arrivalScore(marks);
        const assigned = kids.reduce((sum, row) => sum + row.work.assigned, 0);
        const reviewed = kids.reduce((sum, row) => sum + row.work.reviewed, 0);
        const work = homeworkFollowUp(assigned, reviewed);
        const score = average([arrive.score, work.score]);
        const parentName = parentNames.get(id) ?? "Family";
        return {
          id,
          name: parentName.endsWith("Family") ? parentName : `${parentName} Family`,
          students: kids.length,
          onTimeCount: arrive.onTime,
          arrivalCount: arrive.onTime + arrive.late,
          onTimeArrival: arrive.score,
          homeworkAssigned: assigned,
          homeworkReviewed: reviewed,
          homeworkFollowUp: work.score,
          pickupRecorded: false,
          score,
          rating: ratingFromScore(score),
        };
      }).sort((a, b) => (a.score ?? 101) - (b.score ?? 101));

    const schoolStudents = classCards.reduce((sum, item) => sum + item.students, 0);
    const schoolOnTrack = classCards.reduce((sum, item) => sum + item.onTrackCount, 0);
    const schoolAttention = classCards.reduce((sum, item) => sum + item.attentionCount, 0);
    const schoolSupport = classCards.reduce((sum, item) => sum + item.supportCount, 0);
    const schoolScore = percent(schoolOnTrack, schoolStudents);

    const detailStudents = scored
      .filter((row) => (classId && row.student.classId === classId) || (parentId && row.student.parentId === parentId))
      .map((row) => ({
        id: row.student.id,
        firstName: row.student.firstName,
        lastName: row.student.lastName,
        classId: row.student.classId,
        quranScore: row.quran,
        attendanceScore: row.attend.score,
        homeworkScore: row.work.score,
        homeworkAssigned: row.work.assigned,
        homeworkReviewed: row.work.reviewed,
        onTimeArrival: row.arrive.score,
        score: parentId ? row.familyScore : row.classScore,
        rating: parentId ? row.familyRating : row.rating,
      }));

    return json({
      window: { start, end, days: 28 },
      school: {
        students: schoolStudents,
        onTrackCount: schoolOnTrack,
        attentionCount: schoolAttention,
        supportCount: schoolSupport,
        onTrackPct: schoolScore,
        needsSupportPct: percent(schoolSupport, schoolStudents),
        score: schoolScore,
        rating: ratingFromScore(schoolScore),
      },
      classes: classId ? classCards.filter((item) => item.id === classId) : classCards,
      families: parentId ? familyCards.filter((item) => item.id === parentId) : familyCards,
      students: classId || parentId ? detailStudents : undefined,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
