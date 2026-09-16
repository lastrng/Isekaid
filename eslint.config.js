// Incremental lint for onboarding, daily sessions and Japanese reading; no
// previous ESLint baseline. Syntax is also validated by the full Vite build.
import reactHooks from "eslint-plugin-react-hooks";
export default [{
  plugins:{"react-hooks":reactHooks},
  linterOptions:{reportUnusedDisableDirectives:false},
  files:["src/features/onboarding/**/*.{js,jsx}","src/features/profile/{ProfileScreen,ProfileSettings}.jsx","src/services/auth/accountStorage.js","src/services/sync/{cloudBackup,progressMerge}.js","src/FeatureIntro.jsx","src/App.jsx","src/components/JapaneseDisplay.jsx","src/lib/japanesePreferences.js","src/features/daily/{DailyRitual.jsx,dailyModel.js}","src/features/home/{JourneyHome,TodayHeader}.jsx","src/features/travel/ActivityContext.jsx","src/features/sos/SosJapan.jsx","src/features/search/SearchResultDetail.jsx","src/{Tutor,DailyFeed,ExploreDiscoveries}.jsx"],
  languageOptions:{ecmaVersion:"latest",sourceType:"module",parserOptions:{ecmaFeatures:{jsx:true}},globals:Object.fromEntries(["window","document","globalThis","setTimeout","clearTimeout","setInterval","clearInterval","requestAnimationFrame","cancelAnimationFrame","TextEncoder","localStorage","navigator","fetch","console","CustomEvent","Event","URL","Blob","File","FileReader","Image","Audio","AbortController","IntersectionObserver","ResizeObserver","performance","confirm","alert","crypto","atob","btoa","sessionStorage"].map(name=>[name,"readonly"]))},
  rules:{"no-undef":"error","no-unreachable":"error","no-constant-condition":"error","no-dupe-args":"error","no-dupe-keys":"error","no-duplicate-case":"error","valid-typeof":"error","constructor-super":"error","no-unsafe-finally":"error"}
}];
