import { DailyRitual } from "../daily/DailyRitual.jsx";
import { ContinueCard } from "./ContinueCard.jsx";
import { TodayHeader } from "./TodayHeader.jsx";
import { TodayTravelCard } from "./TodayTravelCard.jsx";

export function TodayPage({ C, header, daily, resume, travel, ritualRef, travelRef, children }) {
  return <div className="today-page" style={{height:"100%",overflowY:"auto",overflowX:"hidden",background:C.bg,fontFamily:"'Inter','Noto Sans JP',sans-serif",position:"relative",paddingBottom:"calc(8px + env(safe-area-inset-bottom, 0px))"}}>
    <TodayHeader C={C} {...header}/>
    <div ref={ritualRef}><DailyRitual C={C} {...daily}/></div>
    <ContinueCard C={C} {...resume}/>
    <div ref={travelRef}><TodayTravelCard C={C} {...travel}/></div>
    {children}
  </div>;
}
