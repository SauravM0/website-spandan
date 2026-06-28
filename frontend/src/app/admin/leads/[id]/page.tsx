import LeadDetailClient from './LeadDetailClient';

export function generateStaticParams() {
  return [{ id: 'placeholder' }];
}

export default function LeadDetailPage({ params }: { params: { id: string } }) {
  return <LeadDetailClient id={params.id} />;
}
