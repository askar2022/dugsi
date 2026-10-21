import { getAppUrl } from "@/lib/env";

function greeting(name?: string | null) {
  return name ? `Assalamu alaikum, ${name}.` : "Assalamu alaikum.";
}

export function enrollmentReceivedEmail(input: {
  schoolName: string;
  parentName?: string | null;
  childName: string;
}) {
  return {
    subject: `${input.childName} is enrolled at ${input.schoolName}`,
    body: [
      greeting(input.parentName),
      "",
      `${input.schoolName} received the enrollment for ${input.childName}.`,
      "The school will review it and add them to the class list.",
      "",
      "You can follow updates in the parent portal.",
    ].join("\n"),
  };
}

export function enrollmentConfirmedEmail(input: {
  schoolName: string;
  parentName?: string | null;
  childName: string;
}) {
  return {
    subject: `${input.childName} is now enrolled at ${input.schoolName}`,
    body: [
      greeting(input.parentName),
      "",
      `Good news. ${input.childName} is now enrolled at ${input.schoolName}.`,
      "Teachers and the office will use this record. Your child does not need a login.",
    ].join("\n"),
  };
}

export function teacherWelcomeEmail(input: {
  schoolName: string;
  teacherName: string;
  title: string;
}) {
  return {
    subject: `Welcome to ${input.schoolName}`,
    body: [
      greeting(input.teacherName),
      "",
      `Welcome to our dugsi. You have been added as ${input.title} at ${input.schoolName}.`,
      `Sign in at ${getAppUrl()}/login with this email. The office can help you with the school code if you need it.`,
      "",
      "We are glad you are with us.",
    ].join("\n"),
  };
}

export function parentWelcomeEmail(input: {
  schoolName: string;
  parentName: string;
  email: string;
}) {
  return {
    subject: `Your parent portal for ${input.schoolName}`,
    body: [
      greeting(input.parentName),
      "",
      `You can now open the parent portal for ${input.schoolName}.`,
      `Sign in at ${getAppUrl()}/login with your school code and ${input.email}.`,
    ].join("\n"),
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
  dueDate?: string | null;
  homeworkId: string;
}) {
  const due = input.dueDate ? ` It is due ${input.dueDate}.` : "";
  return {
    subject: `Homework from ${input.schoolName}: ${input.title}`,
    body: [
      greeting(input.parentName),
      "",
      `${input.schoolName} assigned homework for ${input.childName}: ${input.title}.${due}`,
      "Please help them finish it.",
      "",
      `Homework ${input.homeworkId}`,
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
