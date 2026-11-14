import { router } from 'expo-router';

/**
 * Anyone can browse Deegee and hear previews; an account is only needed to pay. So the sign-in screen
 * is somewhere you are sent from a Buy or Gift button, and sent back from, rather than a wall at the
 * front door.
 */
export function askToSignIn(next?: string) {
  router.push({ pathname: '/sign-in', params: next ? { next } : {} });
}

/** Where to go once someone is signed in: on with what they were doing, or back where they were. */
export function afterSignIn(next: string | undefined, hasName: boolean) {
  if (!hasName) return router.replace('/welcome');
  if (next) return router.replace(next as Parameters<typeof router.replace>[0]);
  if (router.canGoBack()) return router.back();
  router.replace('/');
}
