import assert from "node:assert/strict";
import test from "node:test";
import { configureAnalytics, trackProductEvent } from "../src/services/analytics/analytics.js";

test("ignore les événements non prévus", () => assert.equal(trackProductEvent("arbitrary_event"), false));

test("retire les propriétés personnelles avant de déléguer", () => {
  let received;
  configureAnalytics({track:(name,properties)=>{ received={name,properties}; }});
  assert.equal(trackProductEvent("trip_created",{days:7,email:"secret@example.com",tripName:"privé",premium:true}),true);
  assert.deepEqual(received,{name:"trip_created",properties:{days:7,premium:true}});
  configureAnalytics(null);
});
