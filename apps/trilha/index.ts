import { registerRootComponent } from "expo";

// Side-effect import: registers the background location task at module
// scope, before any React tree exists (TaskManager requirement).
import "./src/locationTask";

import App from "./App";

registerRootComponent(App);
