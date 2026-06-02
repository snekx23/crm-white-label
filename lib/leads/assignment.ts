export interface AssignableAttendant {
  user_id: string;
  is_available: boolean;
  last_assigned_at: string | null;
}

export function chooseRoundRobinAttendant(rows: AssignableAttendant[]) {
  const available = rows.filter((row) => row.is_available);
  if (available.length === 0) return null;
  return [...available].sort((a, b) => {
    if (a.last_assigned_at === null) return -1;
    if (b.last_assigned_at === null) return 1;
    return a.last_assigned_at.localeCompare(b.last_assigned_at);
  })[0];
}
