import { supabase } from './supabase';
import { parseQRPayload } from './qr';

export type RegisterResult = {
  success: boolean;
  message: string;
  eventTitle?: string;
};

export type AttendanceRecord = {
  id: string | number;
  eventId: string;
  eventTitle: string;
  scannedAt: string;
};

export type TeacherEventSummary = {
  eventId: string;
  eventCode: string;
  title: string;
  attendeeCount: number;
};

export type TeacherEventAttendance = {
  eventId: string;
  eventCode: string;
  title: string;
  startTime: string | null;
  endTime: string | null;
  attendeeCount: number;
  attendees: {
    studentId: string;
    scannedAt: string;
  }[];
};

export async function registerAttendance(
  rawPayload: string,
  studentId: string
): Promise<RegisterResult> {
  const parsed = parseQRPayload(rawPayload);
  if (!parsed.ok) return { success: false, message: parsed.message };

  // A QR code must refer to an event already created by an authorized teacher.
  // Never create an event from student-supplied QR contents.
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id, title, start_time, end_time')
    .eq('event_code', parsed.payload.event)
    .maybeSingle();

  if (eventError) return { success: false, message: 'Could not validate this event. Please try again.' };
  if (!event) return { success: false, message: 'This event code is not registered.' };

  const now = Date.now();
  const start = event.start_time ? new Date(event.start_time).getTime() : null;
  const end = event.end_time ? new Date(event.end_time).getTime() : null;
  if (start !== null && now < start) return { success: false, message: 'This event has not started yet.', eventTitle: event.title };
  if (end !== null && now > end) return { success: false, message: 'This event has already ended.', eventTitle: event.title };

  const { error: attendanceError } = await supabase.from('attendance').insert({
    student_id: studentId,
    event_id: event.id,
    scanned_at: new Date().toISOString(),
  });

  if (attendanceError) {
    if (attendanceError.code === '23505') return { success: false, message: 'You already checked in to this event.', eventTitle: event.title };
    return { success: false, message: 'Attendance could not be saved. Please try again.' };
  }
  return { success: true, message: 'Attendance recorded successfully!', eventTitle: event.title };
}

export async function getAttendanceHistory(
  studentId: string
): Promise<AttendanceRecord[]> {
  const { data, error } = await supabase
    .from('attendance')
    .select('id, scanned_at, events ( event_code, title )')
    .eq('student_id', studentId)
    .order('scanned_at', { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map((row: any) => ({
    id: row.id,
    eventId: row.events?.event_code ?? '',
    eventTitle: row.events?.title ?? '',
    scannedAt: row.scanned_at,
  }));
}

export async function getTeacherEventSummary(
  teacherId: string
): Promise<TeacherEventSummary[]> {
  const { data: events, error: eventError } = await supabase
    .from('events')
    .select('id, event_code, title')
    .eq('created_by', teacherId)
    .order('created_at', { ascending: false });

  if (eventError || !events) return [];

  const eventIds = events.map((e: any) => e.id);
  if (eventIds.length === 0) return [];

  const { data: attRows, error: attError } = await supabase
    .from('attendance')
    .select('event_id')
    .in('event_id', eventIds);

  if (attError || !attRows) {
    return events.map((e: any) => ({
      eventId: e.id,
      eventCode: e.event_code,
      title: e.title,
      attendeeCount: 0,
    }));
  }

  const counts: Record<string, number> = {};
  attRows.forEach((r: any) => {
    counts[r.event_id] = (counts[r.event_id] ?? 0) + 1;
  });

  return events.map((e: any) => ({
    eventId: e.id,
    eventCode: e.event_code,
    title: e.title,
    attendeeCount: counts[e.id] ?? 0,
  }));
}

export async function getTeacherEventAttendance(
  teacherId: string
): Promise<TeacherEventAttendance[]> {
  const { data: events, error: eventError } = await supabase
    .from('events')
    .select('id, event_code, title, start_time, end_time')
    .eq('created_by', teacherId)
    .order('created_at', { ascending: false });

  if (eventError || !events) return [];

  const eventIds = events.map((e: any) => e.id);
  if (eventIds.length === 0) return [];

  const { data: attendance, error: attError } = await supabase
    .from('attendance')
    .select('student_id, scanned_at, event_id')
    .in('event_id', eventIds)
    .order('scanned_at', { ascending: false });
    
  if (attError || !attendance) return [];
    
  return events.map((e: any) => {
    const rows = attendance.filter((a: any) => a.event_id === e.id);
    return {
      eventId: e.id,
      eventCode: e.event_code,
      title: e.title,
      startTime: e.start_time,
      endTime: e.end_time,
      attendeeCount: rows.length,
      attendees: rows.map((a: any) => ({
        studentId: a.student_id,
        scannedAt: a.scanned_at,
      })),
    };
  });
}