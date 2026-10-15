import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Clube de Leitura | Grancont', description: 'Ler transforma. Compartilhar multiplica. A biblioteca e o clube de leitura da Grancont.', icons: {icon:'/favicon.svg'} };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="pt-BR"><body>{children}</body></html>; }
