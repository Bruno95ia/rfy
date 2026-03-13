import { SuphoFormClient } from './SuphoFormClient';

interface PageProps {
  params: { slug: string };
}

export default function FormPage({ params }: PageProps) {
  const { slug } = params;
  return <SuphoFormClient slug={slug} />;
}

