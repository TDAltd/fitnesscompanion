import { ErrorBoundary } from "@/components/error-boundary";
import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getGetProfileQueryKey, useGetProfile } from "@workspace/api-client-react";
import { UpdateBanner } from "@/components/layout/update-banner";
import { AUTH_QUERY_KEY, useCurrentUser } from "@/lib/auth";
import { BASE } from "@/lib/base-path";
import { AppLayout } from "@/components/layout/app-layout";
import { Suspense } from "react";
import { lazyPage } from "@/lib/lazy-page";

const NotFound = lazyPage(() => import("@/pages/not-found"));
const DashboardPage = lazyPage(() => import("@/pages/dashboard"));
const ProgressPage = lazyPage(() => import("@/pages/progress"));
const StatsPage = lazyPage(() => import("@/pages/stats"));
const MealsPage = lazyPage(() => import("@/pages/meals"));
const WorkoutPage = lazyPage(() => import("@/pages/workout"));
const OnboardingPage = lazyPage(() => import("@/pages/onboarding"));
const StartPage = lazyPage(() => import("@/pages/start"));
const PrivacyPage = lazyPage(() => import("@/pages/privacy"));
const RemindersPage = lazyPage(() => import("@/pages/reminders"));
const ResetPasswordPage = lazyPage(() => import("@/pages/reset-password"));
const AccountPage = lazyPage(() => import("@/pages/account"));
const MyPlanPage = lazyPage(() => import("@/pages/my-plan"));
const ConnectHealthPage = lazyPage(() => import("@/pages/connect-health"));
const MePage = lazyPage(() => import("@/pages/me"));
const AdminShell = lazyPage(() => import("@/components/layout/admin-layout").then((m) => ({ default: m.AdminShell })));

const PageLoading = () => (
  <main className="grid min-h-[60dvh] place-items-center px-6 text-sm text-muted-foreground" role="status">
    Loading…
  </main>
);

// If any API call says "not logged in" (e.g. session expired), send the user back to the login screen
const queryClient: QueryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      const status = (error as { status?: number }).status;
      if (status === 401) {
        queryClient.setQueryData(AUTH_QUERY_KEY, null);
      } else if (status === 403) {
        // e.g. this account was just made an admin: re-check who they are so the right screens show
        void queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });
      }
    },
  }),
  defaultOptions: {
    queries: {
      retry: (count, error) => (error as { status?: number }).status !== 401 && count < 2,
    },
  },
});

function AuthGate() {
  const [location] = useLocation();
  const { data: user, isLoading } = useCurrentUser();
  // Pages anyone can open, signed in or not
  if (location === "/reset-password") return <ResetPasswordPage />;
  if (location === "/privacy" && !user) return <PrivacyPage standalone />;
  if (isLoading) {
    return (
      <main className="grid min-h-[100dvh] place-items-center px-6 text-sm text-muted-foreground" role="status">
        Loading…
      </main>
    );
  }
  // Not logged in: the sign-up quiz (its first screen links to Log in)
  if (!user) return <StartPage />;
  if (user.isAdmin) return <AdminShell />;
  return <Router />;
}

function Router() {
  const [location] = useLocation();
  const { data: profile, isLoading, isError } = useGetProfile({
    query: { queryKey: getGetProfileQueryKey() },
  });
  const isOnboarding = location === "/onboarding";
  const profileComplete = Boolean(
    profile?.name?.trim() &&
    profile.ageYears != null &&
    profile.sex &&
    profile.heightCm != null &&
    profile.currentWeightKg != null &&
    profile.goalWeightKg != null &&
    profile.activityLevel &&
    profile.fitnessGoal &&
    profile.dietaryPreference &&
    profile.workoutDaysPerWeek != null &&
    profile.workoutLocation &&
    profile.trainingExperience
  );

  if (!isOnboarding && isLoading) {
    return (
      <main className="grid min-h-[100dvh] place-items-center px-6 text-sm text-muted-foreground" role="status">
        Loading your personalized setup…
      </main>
    );
  }
  // Account (import / logout) stays reachable before onboarding is finished,
  // so someone moving from the old app can import their data straight away
  if (location === "/account" && !profileComplete) {
    return (
      <main className="mx-auto w-full max-w-3xl p-4 md:p-8">
        <AccountPage />
      </main>
    );
  }
  if (location === "/privacy" && !profileComplete) return <PrivacyPage standalone />;
  // Logged in but never finished setting up: the quiz, then straight into the app
  if (!isError && !profileComplete && !isLoading) return <StartPage member />;
  // Existing users change their answers on the full form
  if (isOnboarding) return <OnboardingPage />;

  return (
    <AppLayout>
      <Suspense fallback={<PageLoading />}>
      <Switch>
        <Route path="/">
          <Redirect to="/today" />
        </Route>
        <Route path="/today" component={DashboardPage} />
        <Route path="/progress" component={ProgressPage} />
        <Route path="/train" component={WorkoutPage} />
        <Route path="/eat" component={MealsPage} />
        <Route path="/body" component={StatsPage} />
        {/* Old addresses still work */}
        <Route path="/dashboard">{() => <Redirect to="/today" replace />}</Route>
        <Route path="/workout">{() => <Redirect to="/train" replace />}</Route>
        <Route path="/meals">{() => <Redirect to="/eat" replace />}</Route>
        <Route path="/stats">{() => <Redirect to="/body" replace />}</Route>
        <Route path="/calorie-calculator">{() => <Redirect to="/plan" />}</Route>
        <Route path="/me" component={MePage} />
        <Route path="/plan" component={MyPlanPage} />
        <Route path="/connect-health" component={ConnectHealthPage} />
        <Route path="/account" component={AccountPage} />
        <Route path="/reminders" component={RemindersPage} />
        <Route path="/privacy">{() => <PrivacyPage />}</Route>
        <Route component={NotFound} />
      </Switch>
      </Suspense>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={BASE}>
          <ErrorBoundary>
            <Suspense fallback={<PageLoading />}>
              <AuthGate />
            </Suspense>
          </ErrorBoundary>
          <UpdateBanner />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
