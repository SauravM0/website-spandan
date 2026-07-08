import PackageDetailClient from './PackageDetailClient';

export default function PackageDetailPage({ params }: { params: { id: string } }) {
  return <PackageDetailClient id={params.id} />;
}
