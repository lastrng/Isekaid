import { buildOnboardingProfile } from "./onboardingModel.js";
import { Presentation } from "./components/Presentation.jsx";

export function Onboarding({onComplete,googleInfo,onEvent,initialIndex,onIndexChange}) {
  return <Presentation mode="new" initialIndex={initialIndex} onIndexChange={onIndexChange} onEvent={onEvent} onDone={({skipped})=>onComplete(buildOnboardingProfile({
    relationship:"dreaming",why:[],level:"beginner",name:googleInfo?.name||"Voyageur",photo:googleInfo?.photo||null,
  }),{skipped})}/>;
}
