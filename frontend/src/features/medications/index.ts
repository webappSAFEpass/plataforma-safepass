// API pública de medicamentos, vacinas e lembretes (Squad 44, histórico médico).
export { DoseAlerts } from "./components/DoseAlerts";
export { MedicationList } from "./components/MedicationList";
export { NotificationPermission } from "./components/NotificationPermission";
export { OwnerSelect } from "./components/OwnerSelect";
export { QueryState } from "./components/QueryState";
export { ReminderList } from "./components/ReminderList";
export { VaccineList } from "./components/VaccineList";
export { useDependents } from "./hooks/useDependents";
export { medicationsQueryKey, useMedications } from "./hooks/useMedications";
export { remindersQueryKey, useReminders } from "./hooks/useReminders";
export type { Dependent, Medication, Page, Reminder } from "./types";
export { nextFullHour, ownerName, reminderLabel, todayISO } from "./utils";
