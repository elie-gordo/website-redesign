/**
 * Renders the TENSIL intro (site loading screen) from the same GLB as the web viewer.
 * The site's public/ folder is shared: staticFile('models/tensil.glb') is the real model.
 * Note: the Node.js render APIs ignore this file; the CLI (npm run render) uses it.
 */
import { Config } from "@remotion/cli/config";

Config.setRspack(true);
Config.setPublicDir("../../public");
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
Config.setDefaultPremountInSeconds(2);
