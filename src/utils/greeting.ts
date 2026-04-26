export function getTimeGreeting(date: Date = new Date()): string {
  const hour = date.getHours();

  // Night spans across midnight: 10:00 PM -> 5:00 AM
  if (hour >= 22 || hour < 5) return 'Good Night';
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}
