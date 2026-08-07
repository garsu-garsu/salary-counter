import { useEffect, useState } from "react";
import "./App.css";
import type { Profile } from "./lib/types";
import { loadProfile, saveProfile } from "./lib/storage";
import { preloadInterstitial, showInterstitialOncePerDay } from "./lib/interstitialAd";
import { IntroPage } from "./pages/IntroPage";
import { OnboardingPage } from "./pages/OnboardingPage";
import { MainPage } from "./pages/MainPage";
import { track } from "./lib/analytics";

const ONBOARDED_KEY = "salary-counter:onboarded";

function App() {
  const [profile, setProfile] = useState<Profile | null>(() => loadProfile());
  const [editing, setEditing] = useState(false);
  // 첫 실행이면 연봉을 묻기 전에 무엇을 하는 앱인지 먼저 알려줘요.
  const [onboarded, setOnboarded] = useState(
    () => localStorage.getItem(ONBOARDED_KEY) != null || loadProfile() != null,
  );

  // 앱 진입 1회 로깅 — 저장된 프로필이 없으면 첫 방문으로 간주해요.
  useEffect(() => {
    track.appOpen(loadProfile() == null);
  }, []);

  const showingOnboarding = profile == null || editing;

  // 정보 수정 화면에 들어오면 미리 전면 광고를 불러와 둬요. (저장 시 바로 노출되도록)
  useEffect(() => {
    if (editing) preloadInterstitial();
  }, [editing]);

  const handleComplete = (next: Profile) => {
    // 신규 첫 설정이 아니라 기존 정보를 수정·저장할 때만 전면 광고를 노출해요.
    const isEdit = profile != null;
    saveProfile(next);
    setProfile(next);
    setEditing(false);
    if (isEdit) showInterstitialOncePerDay();
  };

  if (!onboarded) {
    return (
      <IntroPage
        onStart={() => {
          localStorage.setItem(ONBOARDED_KEY, "1");
          setOnboarded(true);
        }}
      />
    );
  }

  if (showingOnboarding) {
    return <OnboardingPage initial={profile ?? undefined} onComplete={handleComplete} />;
  }

  return <MainPage profile={profile} onEdit={() => setEditing(true)} />;
}

export default App;
