import { Route, Switch } from "wouter";
import { Provider } from "./components/provider";
import { ProtectedRoute } from "./components/protected-route";
import { AgentFeedback } from "@runablehq/website-runtime";

import Landing from "./pages/landing";
import Terms from "./pages/terms";
import Privacy from "./pages/privacy";
import RefundPolicy from "./pages/refund-policy";
import SignIn from "./pages/sign-in";
import Dashboard from "./pages/dashboard";
import Projects from "./pages/projects";
import ProjectDetail from "./pages/project-detail";
import Clips from "./pages/clips";
import ClipDetail from "./pages/clip-detail";
import Scheduler from "./pages/scheduler";
import Connections from "./pages/connections";
import Pricing from "./pages/pricing";
import Settings from "./pages/settings";
import FeatureRequests from "./pages/feature-requests";

function App() {
  return (
    <Provider>
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/terms" component={Terms} />
        <Route path="/privacy" component={Privacy} />
        <Route path="/refund-policy" component={RefundPolicy} />
        <Route path="/sign-in" component={SignIn} />
        <Route path="/dashboard">
          <ProtectedRoute><Dashboard /></ProtectedRoute>
        </Route>
        <Route path="/projects">
          <ProtectedRoute><Projects /></ProtectedRoute>
        </Route>
        <Route path="/upload">
          <ProtectedRoute><Projects /></ProtectedRoute>
        </Route>
        <Route path="/projects/:id">
          <ProtectedRoute><ProjectDetail /></ProtectedRoute>
        </Route>
        <Route path="/clips">
          <ProtectedRoute><Clips /></ProtectedRoute>
        </Route>
        <Route path="/clips/:id">
          <ProtectedRoute><ClipDetail /></ProtectedRoute>
        </Route>
        <Route path="/scheduler">
          <ProtectedRoute><Scheduler /></ProtectedRoute>
        </Route>
        <Route path="/connections">
          <ProtectedRoute><Connections /></ProtectedRoute>
        </Route>
        <Route path="/pricing">
          <ProtectedRoute><Pricing /></ProtectedRoute>
        </Route>
        <Route path="/settings">
          <ProtectedRoute><Settings /></ProtectedRoute>
        </Route>
        <Route path="/feature-requests">
          <ProtectedRoute><FeatureRequests /></ProtectedRoute>
        </Route>
      </Switch>
      {import.meta.env.DEV && <AgentFeedback />}
    </Provider>
  );
}

export default App;
