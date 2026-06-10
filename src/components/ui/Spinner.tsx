/**
 * Re-export of the canonical loader. The implementation now lives in
 * `@/components/ds/Spinner` (single source of truth). Kept here for the
 * many existing `@/components/ui/Spinner` imports across the app.
 */
export { Spinner, FullPageSpinner, SectionSpinner } from "@/components/ds/Spinner";
export type { SpinnerProps } from "@/components/ds/Spinner";
