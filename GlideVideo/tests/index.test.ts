import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockControllerConstructor = vi.fn();

vi.mock('../src/core/Controller', () => {
    return {
        Controller: class {
            constructor() {
                mockControllerConstructor();
            }
        }
    };
});

describe('Entry Point (index.ts)', () => {
    beforeEach(() => {
        vi.resetModules();
        mockControllerConstructor.mockClear();

        // Setup mock window & location
        (global as any).window = {
            location: {
                hostname: 'testsite.com',
                reload: vi.fn()
            }
        };

        // Reset global GM functions
        delete (global as any).GM_getValue;
        delete (global as any).GM_setValue;
        delete (global as any).GM_registerMenuCommand;
    });

    afterEach(() => {
        delete (global as any).window;
        delete (global as any).GM_getValue;
        delete (global as any).GM_setValue;
        delete (global as any).GM_registerMenuCommand;
    });

    it('should initialize Controller by default if GM APIs are not available', async () => {
        await import('../src/index');
        expect(mockControllerConstructor).toHaveBeenCalledTimes(1);
    });

    it('should register menu command and initialize Controller if site is enabled (default)', async () => {
        const mockRegister = vi.fn();
        const mockGetValue = vi.fn().mockReturnValue(false);

        (global as any).GM_registerMenuCommand = mockRegister;
        (global as any).GM_getValue = mockGetValue;

        await import('../src/index');

        expect(mockGetValue).toHaveBeenCalledWith('disabled_testsite.com', false);
        expect(mockRegister).toHaveBeenCalledWith('GlideVideo: Disable on testsite.com', expect.any(Function));
        expect(mockControllerConstructor).toHaveBeenCalledTimes(1);
    });

    it('should register menu command and NOT initialize Controller if site is disabled', async () => {
        const mockRegister = vi.fn();
        const mockGetValue = vi.fn().mockReturnValue(true);

        (global as any).GM_registerMenuCommand = mockRegister;
        (global as any).GM_getValue = mockGetValue;

        await import('../src/index');

        expect(mockGetValue).toHaveBeenCalledWith('disabled_testsite.com', false);
        expect(mockRegister).toHaveBeenCalledWith('GlideVideo: Enable on testsite.com', expect.any(Function));
        expect(mockControllerConstructor).not.toHaveBeenCalled();
    });

    it('should toggle disabled status and reload page when menu command is clicked', async () => {
        const mockRegister = vi.fn();
        const mockGetValue = vi.fn().mockReturnValue(false);
        const mockSetValue = vi.fn();
        const mockReload = vi.fn();

        (global as any).GM_registerMenuCommand = mockRegister;
        (global as any).GM_getValue = mockGetValue;
        (global as any).GM_setValue = mockSetValue;
        (global as any).window.location.reload = mockReload;

        await import('../src/index');

        // Extract the command function and invoke it
        const clickCallback = mockRegister.mock.calls[0][1];
        clickCallback();

        expect(mockSetValue).toHaveBeenCalledWith('disabled_testsite.com', true);
        expect(mockReload).toHaveBeenCalled();
    });
});
