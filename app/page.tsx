import LibraryApp from './library-app';
import { TRUST_PLATFORM_AUTH } from '@/lib/runtime-env';
export const dynamic = 'force-dynamic';
export default function Page() { return <LibraryApp allowPlatformLogin={TRUST_PLATFORM_AUTH}/>; }
