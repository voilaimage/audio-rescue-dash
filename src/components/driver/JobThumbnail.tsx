import { useSignedUrl } from "@/hooks/useSignedUrl";
import { Skeleton } from "@/components/ui/skeleton";

interface JobThumbnailProps {
  fileUrl: string;
  className?: string;
}

export function JobThumbnail({ fileUrl, className = "h-16 w-16 shrink-0 rounded-lg object-cover" }: JobThumbnailProps) {
  const { signedUrl, loading } = useSignedUrl(fileUrl, "request-photos");

  if (loading) {
    return <Skeleton className={className} />;
  }

  return (
    <img
      src={signedUrl || ""}
      alt=""
      className={className}
    />
  );
}
