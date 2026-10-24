import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getGetProfileQueryKey, useGetProfile } from "@workspace/api-client-react";
import NotFound from "@/pages/not-found";
import DashboardPage from "@/pages/dashboard";
import ProgressPage from "@/pages/progress";
import StatsPage from "@/pages/stats";
import MealsPage from "@/pages/meals";
import WorkoutPage from "@/pages/workout";
import CalorieCalculatorPage from "@/pages/calorie-calculator";
import OnboardingPage from "@/pages/onboarding";
import AuthPage from "@/pages/auth";
import AccountPage from "@/pages/account";
import MyPlanPage from "@/pages/my-plan";
import ConnectHealthPage from "@/pages/connect-health";
import MePage from "@/pages/me";
import { AdminShell } from "@/components/layout/admin-layout";
import { AUTH_QUERY_KEY, useCurrentUser } from "@/lib/auth";
import { BASE } from "@/lib/base-path";
import { AppLayout } from "@/components/layout/app-layout";

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
  const { data: user, isLoading } = useCurrentUser();
  if (isLoading) {
    return (
      <main className="grid min-h-[100dvh] place-items-center px-6 text-sm text-muted-foreground" role="status">
        Loading…
      </main>
    );
  }
  if (!user) return <AuthPage />;
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
  if (!isOnboarding && !isError && !profileComplete) {
    return <Redirect to="/onboarding" />;
  }
  if (isOnboarding) return <OnboardingPage />;

  return (
    <AppLayout>
      <Switch>
        <Route path="/">
          <Redirect to="/dashboard" />
        </Route>
        <Route path="/dashboard" component={DashboardPage} />
        <Route path="/progress" component={ProgressPage} />
        <Route path="/workout" component={WorkoutPage} />
        <Route path="/meals" component={MealsPage} />
        <Route path="/stats" component={StatsPage} />
        <Route path="/calorie-calculator" component={CalorieCalculatorPage} />
        <Route path="/me" component={MePage} />
        <Route path="/plan" component={MyPlanPage} />
        <Route path="/connect-health" component={ConnectHealthPage} />
        <Route path="/account" component={AccountPage} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={BASE}>
          <AuthGate />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
