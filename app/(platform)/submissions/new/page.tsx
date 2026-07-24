import { Suspense } from "react";
import { LoadingState } from "@/components/states";
import { NewSubmissionPage } from "@/features/submissions/new-submission-page";

export default function Page() {
  return <Suspense fallback={<LoadingState />}><NewSubmissionPage /></Suspense>;
}
