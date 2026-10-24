import { getAppUrl } from "@/lib/env";
import { schoolLoginPath } from "@/lib/login-path";

function greeting(name?: string | null) {
  return name ? `Assalamu alaikum, ${name}.` : "Assalamu alaikum.";
}

function childList(names: string[]) {
  const clean = names.map((name) => name.trim()).filter(Boolean);
  if (clean.length === 0) return "your child";
  if (clean.length === 1) return clean[0];
  if (clean.length === 2) return `${clean[0]} and ${clean[1]}`;
  return `${clean.slice(0, -1).join(", ")}, and ${clean[clean.length - 1]}`;
}

export function enrollmentReceivedEmail(input: {
  schoolName: string;
  parentName?: string | null;
  childName?: string;
  childNames?: string[];
}) {
  const names = input.childNames?.length ? input.childNames : input.childName ? [input.childName] : [];
  const list = childList(names);
  const waiting =
    names.length > 1
      ? "They are enrolled and waiting for assessment."
      : `${list} is enrolled and waiting for assessment.`;
  return {
    subject: `${input.schoolName} received your enrollment`,
    body: [
      greeting(input.parentName),
      "",
      `${input.schoolName} received your enrollment for ${list}.`,
      waiting,
      "The school will contact you.",
      "Sign in on the school page with your own username and password.",
    ].join("\n"),
  };
}

export function enrollmentAcceptedEmail(input: {
  schoolName: string;
  parentName?: string | null;
  childName: string;
}) {
  return {
    subject: `${input.schoolName} accepted ${input.childName} for assessment`,
    body: [
      greeting(input.parentName),
      "",
      `${input.schoolName} accepted ${input.childName}. The child is waiting for assessment.`,
      "The office will place them in the right class after that. Sign in with your own username and password.",
    ].join("\n"),
  };
}

export function enrollmentConfirmedEmail(input: {
  schoolName: string;
  parentName?: string | null;
  childName: string;
  className?: string | null;
}) {
  const classLine = input.className
    ? `${input.childName} is now enrolled at ${input.schoolName} in ${input.className}.`
    : `${input.childName} is now enrolled at ${input.schoolName}.`;
  return {
    subject: `${input.childName} is now enrolled at ${input.schoolName}`,
    body: [
      greeting(input.parentName),
      "",
      `Good news. ${classLine}`,
      "Teachers and the office will use this record. Sign in with your own username and password to see your children.",
    ].join("\n"),
  };
}

export function teacherWelcomeEmail(input: {
  schoolName: string;
  teacherName: string;
  title: string;
  inviteLink?: string | null;
  schoolCode?: string | null;
  loginRole?: "admin" | "teacher" | "parent";
}) {
  const staffLogin = `${getAppUrl()}${schoolLoginPath(input.loginRole ?? "teacher", input.schoolCode)}`;
  return {
    subject: `Welcome to ${input.schoolName}`,
    body: [
      greeting(input.teacherName),
      "",
      `Welcome to our dugsi. You have been added as ${input.title} at ${input.schoolName}.`,
      input.inviteLink
        ? `Create your own password here: ${input.inviteLink}`
        : `Sign in at ${staffLogin} with this email.`,
      "",
      "We are glad you are with us.",
    ].join("\n"),
  };
}

export function adminLoginCodeEmail(input: {
  schoolName: string;
  name?: string | null;
  code: string;
}) {
  return {
    subject: `Your 6-digit admin code for ${input.schoolName}`,
    body: [
      greeting(input.name),
      "",
      `Your admin sign-in code is ${input.code}.`,
      "It expires in 10 minutes. Do not share it.",
      "Teachers and parents do not use this code.",
    ].join("\n"),
  };
}

export function passwordResetEmail(input: {
  schoolName: string;
  name?: string | null;
  resetLink: string;
}) {
  return {
    subject: `Reset your password for ${input.schoolName}`,
    body: [
      greeting(input.name),
      "",
      `Reset your own password for ${input.schoolName} here:`,
      input.resetLink,
      "",
      "This login is only for you. Do not share it.",
    ].join("\n"),
  };
}

export function parentWelcomeEmail(input: {
  schoolName: string;
  parentName: string;
  email: string;
  inviteLink?: string | null;
  schoolCode?: string | null;
}) {
  return {
    subject: `Your parent portal for ${input.schoolName}`,
    body: [
      greeting(input.parentName),
      "",
      `You can now open the parent portal for ${input.schoolName}.`,
      input.inviteLink
        ? `Create your own password here: ${input.inviteLink}`
        : `Sign in at ${getAppUrl()}${schoolLoginPath("parent", input.schoolCode)} with your username ${input.email} and your own password.`,
      input.schoolCode ? `School code: ${input.schoolCode}` : "",
    ].filter(Boolean).join("\n"),
  };
}

export function tuitionDueEmail(input: {
  schoolName: string;
  parentName?: string | null;
  childName: string;
  amount: number;
  dueDate: string;
  recordId: string;
}) {
  return {
    subject: `Tuition is due for ${input.childName}`,
    body: [
      greeting(input.parentName),
      "",
      `The tuition record for ${input.childName} at ${input.schoolName} is due.`,
      `Amount on file: $${input.amount.toFixed(2)}. Due ${input.dueDate}.`,
      "Please pay at the dugsi. This is a reminder only. We do not take card payments in the app.",
      "",
      `Record ${input.recordId}`,
    ].join("\n"),
  };
}

export function homeworkAssignedEmail(input: {
  schoolName: string;
  parentName?: string | null;
  childName: string;
  title: string;
  portion?: string | null;
  instructions?: string | null;
  dueDate?: string | null;
  homeworkId: string;
}) {
  const due = input.dueDate ? ` It is due ${input.dueDate}.` : "";
  return {
    subject: `Homework from ${input.schoolName}: ${input.title}`,
    body: [
      greeting(input.parentName),
      "",
      `${input.schoolName} assigned Quran homework for ${input.childName}: ${input.title}.${due}`,
      input.portion ? `Portion: ${input.portion}.` : "",
      input.instructions ? input.instructions : "Please help them finish it at home.",
      "In the parent portal you can mark it Done or Needs help.",
      "",
      `Homework ${input.homeworkId}`,
    ].filter(Boolean).join("\n"),
  };
}

export function progressContactEmail(input: {
  schoolName: string;
  parentName?: string | null;
  childName: string;
  surah: string;
  ayahFrom: number;
  ayahTo: number;
  date: string;
  progressId: string;
}) {
  return {
    subject: `Please contact ${input.schoolName} about ${input.childName}'s Quran progress`,
    body: [
      greeting(input.parentName),
      "",
      `The teacher at ${input.schoolName} marked ${input.childName}'s Quran progress as red: please contact the school.`,
      `Latest record: Surah ${input.surah}, Ayah ${input.ayahFrom}–${input.ayahTo}, ${input.date}.`,
      "Please reach out to the office or teacher so you can review this together.",
      "",
      `Progress ${input.progressId}`,
    ].join("\n"),
  };
}

export function weekendHomeworkEmail(input: {
  schoolName: string;
  parentName?: string | null;
  childName: string;
  title: string;
  dueDate?: string | null;
  homeworkId: string;
}) {
  const due = input.dueDate ? ` due ${input.dueDate}` : "";
  return {
    subject: `Weekend reminder: ${input.title}`,
    body: [
      greeting(input.parentName),
      "",
      `A reminder from ${input.schoolName}: ${input.childName} has homework "${input.title}"${due}.`,
      "Please help them finish it before the weekend.",
      "",
      `Homework ${input.homeworkId}`,
    ].join("\n"),
  };
}
