// src/index.ts
import { Controller } from './core/Controller';

try {
    const controller = new Controller();
    controller.init();
} catch (err) {
    console.error('[SVF] Init error:', err);
}
