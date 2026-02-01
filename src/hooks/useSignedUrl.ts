import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Extracts the file path from a Supabase storage URL
 * URL format: https://xxx.supabase.co/storage/v1/object/public/bucket-name/path/to/file
 */
function extractFilePath(url: string, bucketName: string): string | null {
  try {
    // Handle both public URLs and signed URLs
    const publicPattern = `/storage/v1/object/public/${bucketName}/`;
    const signedPattern = `/storage/v1/object/sign/${bucketName}/`;
    
    let pathStart = url.indexOf(publicPattern);
    if (pathStart !== -1) {
      // Keep path as-is without decoding - Supabase API needs the raw path
      const rawPath = url.substring(pathStart + publicPattern.length).split('?')[0];
      // Decode first then re-encode to ensure consistent encoding
      return decodeURIComponent(rawPath);
    }
    
    pathStart = url.indexOf(signedPattern);
    if (pathStart !== -1) {
      const rawPath = url.substring(pathStart + signedPattern.length).split('?')[0];
      return decodeURIComponent(rawPath);
    }
    
    // Try to parse as URL and extract path after bucket name
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split(`/${bucketName}/`);
    if (pathParts.length > 1) {
      return decodeURIComponent(pathParts[1].split('?')[0]);
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Hook to get a signed URL for a file in a private bucket
 * @param originalUrl - The original public URL stored in the database
 * @param bucketName - The name of the storage bucket
 * @param expiresIn - How long the signed URL is valid (in seconds), default 1 hour
 */
export function useSignedUrl(
  originalUrl: string | null | undefined,
  bucketName: string = "request-photos",
  expiresIn: number = 3600
): { signedUrl: string | null; loading: boolean; error: Error | null } {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!originalUrl) {
      setSignedUrl(null);
      setLoading(false);
      return;
    }

    const getSignedUrl = async () => {
      try {
        setLoading(true);
        setError(null);

        const filePath = extractFilePath(originalUrl, bucketName);
        if (!filePath) {
          throw new Error("Could not extract file path from URL");
        }

        const { data, error: signError } = await supabase.storage
          .from(bucketName)
          .createSignedUrl(filePath, expiresIn);

        if (signError) throw signError;
        if (!data?.signedUrl) throw new Error("No signed URL returned");

        setSignedUrl(data.signedUrl);
      } catch (err) {
        console.error("Failed to get signed URL:", err);
        setError(err instanceof Error ? err : new Error("Failed to get signed URL"));
        // Fallback to original URL (won't work for private buckets, but prevents broken images)
        setSignedUrl(originalUrl);
      } finally {
        setLoading(false);
      }
    };

    getSignedUrl();
  }, [originalUrl, bucketName, expiresIn]);

  return { signedUrl, loading, error };
}

/**
 * Hook to get signed URLs for multiple files in a private bucket
 * @param originalUrls - Array of original public URLs stored in the database
 * @param bucketName - The name of the storage bucket
 * @param expiresIn - How long the signed URLs are valid (in seconds), default 1 hour
 */
export function useSignedUrls(
  originalUrls: string[],
  bucketName: string = "request-photos",
  expiresIn: number = 3600
): { signedUrls: (string | null)[]; loading: boolean; error: Error | null } {
  const [signedUrls, setSignedUrls] = useState<(string | null)[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!originalUrls || originalUrls.length === 0) {
      setSignedUrls([]);
      setLoading(false);
      return;
    }

    const getSignedUrls = async () => {
      try {
        setLoading(true);
        setError(null);

        const results = await Promise.all(
          originalUrls.map(async (url) => {
            const filePath = extractFilePath(url, bucketName);
            if (!filePath) return url; // Fallback to original URL

            const { data, error: signError } = await supabase.storage
              .from(bucketName)
              .createSignedUrl(filePath, expiresIn);

            if (signError || !data?.signedUrl) return url; // Fallback
            return data.signedUrl;
          })
        );

        setSignedUrls(results);
      } catch (err) {
        console.error("Failed to get signed URLs:", err);
        setError(err instanceof Error ? err : new Error("Failed to get signed URLs"));
        // Fallback to original URLs
        setSignedUrls(originalUrls);
      } finally {
        setLoading(false);
      }
    };

    getSignedUrls();
  }, [JSON.stringify(originalUrls), bucketName, expiresIn]);

  return { signedUrls, loading, error };
}
