// src/pages/app/ai/copilot/components/CopilotBackdrop.tsx
// Shared circuit backdrop for the COPILOT shell.
export function CopilotBackdrop() {
  return (
    <>
      <div
        className="pointer-events-none absolute inset-0 opacity-55"
        style={{
          backgroundImage: `
            linear-gradient(rgba(201,166,70,0.055) 1px, transparent 1px),
            linear-gradient(90deg, rgba(201,166,70,0.045) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
          maskImage: 'linear-gradient(to bottom, black 0%, black 80%, transparent 100%)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `
            radial-gradient(circle at 50% 9%, rgba(244,217,123,0.18), transparent 24%),
            radial-gradient(circle at 84% 6%, rgba(201,166,70,0.10), transparent 18%),
            linear-gradient(180deg, transparent 0%, #030302 88%)
          `,
        }}
      />
    </>
  );
}
