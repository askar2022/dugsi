"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/portal/PageHeader";
import { api } from "@/lib/api";

type Progress = {
  id: string;
  surah: string;
  ayahFrom: number;
  ayahTo: number;
  date: string;
  student: { firstName: string; lastName: string };
};

export default function ParentProgressPage() {
  const [progress, setProgress] = useState<Progress[]>([]);

  useEffect(() => {
    api<{ progress: Progress[] }>("/api/progress").then((data) => setProgress(data.progress));
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader title="Progress" description="The Quran verses your child has reached." />
      <div className="card table-wrap p-2">
        <table>
          <thead>
            <tr>
              <th>Child</th>
              <th>Surah</th>
              <th>Ayah</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {progress.map((item) => (
              <tr key={item.id}>
                <td>{item.student.firstName} {item.student.lastName}</td>
                <td>{item.surah}</td>
                <td>{item.ayahFrom}-{item.ayahTo}</td>
                <td>{item.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
