// Configure Amplify as a side effect on import. This file must be imported
// BEFORE App (and therefore before any module that calls generateClient at
// load time), so that Amplify.configure() runs first. Otherwise the ~dozen
// `const client = generateClient()` calls at module top-level execute during
// the import phase and log "Amplify has not been configured".
import { Amplify } from 'aws-amplify';
import outputs from './amplify_outputs.json';

Amplify.configure(outputs);
