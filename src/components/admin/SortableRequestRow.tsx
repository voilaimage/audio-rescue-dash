import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { 
  GripVertical, ChevronRight, ChevronDown, User, Archive, 
  ArchiveRestore, FileText, MapPin, Phone, Calendar, Clock, Camera 
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { RequestWithPhotos } from "@/lib/supabase";

type RequestWithArchive = RequestWithPhotos & {
  archived_at?: string | null;
};

type StatusConfig = {
  bg: string;
  text: string;
  border: string;
  label: string;
};

interface SortableRequestRowProps {
  request: RequestWithArchive;
  statusConfig: Record<string, StatusConfig>;
  signedUrlMap: Map<string, string>;
  urlsLoading: boolean;
  isArchivable: boolean;
  isSelected: boolean;
  isExpanded: boolean;
  compactView: boolean;
  isDragEnabled: boolean;
  onToggleSelect: (id: string) => void;
  onToggleExpand: (id: string) => void;
  onArchiveToggle: (id: string, isArchived: boolean) => void;
}

export function SortableRequestRow({
  request,
  statusConfig,
  signedUrlMap,
  urlsLoading,
  isArchivable,
  isSelected,
  isExpanded,
  compactView,
  isDragEnabled,
  onToggleSelect,
  onToggleExpand,
  onArchiveToggle,
}: SortableRequestRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: request.id,
    disabled: !isDragEnabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : undefined,
  };

  const status = statusConfig[request.status] || statusConfig.new;
  const firstPhotoUrl = request.request_photos?.[0]?.file_url;
  const signedUrl = firstPhotoUrl ? signedUrlMap.get(firstPhotoUrl) : null;

  return (
    <React.Fragment>
      <tr 
        ref={setNodeRef}
        style={style}
        className={`hover:bg-white/5 cursor-pointer ${isSelected ? "bg-primary/5" : ""} ${isExpanded ? "bg-white/5" : ""} ${isDragging ? "bg-primary/10" : ""}`}
        onClick={() => onToggleExpand(request.id)}
      >
        {/* Drag Handle + Checkbox Cell */}
        <td className="px-2 py-3" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-1">
            {isDragEnabled && (
              <button
                {...attributes}
                {...listeners}
                className="flex h-6 w-6 cursor-grab items-center justify-center rounded text-gray-500 hover:text-white hover:bg-white/10 active:cursor-grabbing"
                title="Drag to reorder"
              >
                <GripVertical className="h-4 w-4" />
              </button>
            )}
            {isArchivable ? (
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => onToggleSelect(request.id)}
                className="border-gray-500 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
            ) : (
              <div className={isDragEnabled ? "h-4 w-4" : "h-4 w-4 ml-7"} />
            )}
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            {firstPhotoUrl && urlsLoading ? (
              <div className="h-10 w-10 shrink-0 rounded-lg bg-[#28292b] flex items-center justify-center">
                <LoadingSpinner size="sm" />
              </div>
            ) : firstPhotoUrl && signedUrl ? (
              <img
                src={signedUrl}
                alt=""
                className="h-10 w-10 shrink-0 rounded-lg object-cover"
              />
            ) : (
              <div className="h-10 w-10 shrink-0 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-white font-semibold text-sm">
                  {request.profiles?.business_name?.charAt(0).toUpperCase() || "B"}
                </span>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-white">
                {request.profiles?.business_name}
              </p>
              <p className="text-xs text-gray-400">
                {request.profiles?.contact_name}
              </p>
            </div>
          </div>
        </td>
        <td className="px-4 py-3">
          <p className="max-w-[200px] truncate text-sm text-white">
            {request.description}
          </p>
        </td>
        {!compactView && (
          <td className="px-4 py-3">
            <p className="text-sm text-white">{request.profiles?.city}</p>
            <p className="text-xs text-gray-400">{request.profiles?.postcode}</p>
          </td>
        )}
        {!compactView && (
          <td className="px-4 py-3">
            {request.assigned_driver ? (
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20">
                  <User className="h-3 w-3 text-primary" />
                </div>
                <span className="text-sm text-white">
                  {request.assigned_driver.contact_name}
                </span>
              </div>
            ) : (
              <span className="text-sm text-gray-500">Unassigned</span>
            )}
          </td>
        )}
        {!compactView && (
          <td className="px-4 py-3">
            <p className="text-sm text-white">
              {format(new Date(request.created_at), "d MMM yyyy")}
            </p>
            <p className="text-xs text-gray-400">
              {format(new Date(request.created_at), "h:mm a")}
            </p>
          </td>
        )}
        <td className="px-4 py-3">
          <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${status.bg} ${status.text} ${status.border}`}>
            {status.label}
          </span>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            {/* Expand/Collapse indicator */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand(request.id);
              }}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-gray-400 hover:bg-white/20 hover:text-white transition-colors"
              title={isExpanded ? "Collapse" : "Expand"}
            >
              <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
            </button>
            {/* Archive/Unarchive button - only for collected, completed, or cancelled */}
            {isArchivable && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onArchiveToggle(request.id, !!request.archived_at);
                }}
                className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                  request.archived_at 
                    ? "bg-success/20 text-success hover:bg-success/30" 
                    : "bg-white/10 text-gray-400 hover:bg-white/20 hover:text-white"
                }`}
                title={request.archived_at ? "Unarchive" : "Archive"}
              >
                {request.archived_at ? (
                  <ArchiveRestore className="h-4 w-4" />
                ) : (
                  <Archive className="h-4 w-4" />
                )}
              </button>
            )}
            <Link
              to={`/admin/requests/${request.id}`}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white"
              onClick={(e) => e.stopPropagation()}
            >
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </td>
      </tr>
      
      {/* Expanded Row */}
      {isExpanded && (
        <tr className="bg-black/20">
          <td colSpan={8} className="px-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Description & Notes */}
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 text-gray-400 text-xs uppercase tracking-wide mb-2">
                    <FileText className="h-3 w-3" />
                    Description
                  </div>
                  <p className="text-sm text-white">{request.description || "No description"}</p>
                </div>
                {request.collection_notes && (
                  <div>
                    <div className="flex items-center gap-2 text-gray-400 text-xs uppercase tracking-wide mb-2">
                      <FileText className="h-3 w-3" />
                      Collection Notes
                    </div>
                    <p className="text-sm text-white">{request.collection_notes}</p>
                  </div>
                )}
              </div>

              {/* Contact & Address */}
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 text-gray-400 text-xs uppercase tracking-wide mb-2">
                    <MapPin className="h-3 w-3" />
                    Address
                  </div>
                  <p className="text-sm text-white">
                    {request.profiles?.address_line1}
                    {request.profiles?.address_line2 && <>, {request.profiles.address_line2}</>}
                  </p>
                  <p className="text-sm text-white">
                    {request.profiles?.city}, {request.profiles?.postcode}
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-gray-400 text-xs uppercase tracking-wide mb-2">
                    <Phone className="h-3 w-3" />
                    Phone
                  </div>
                  <p className="text-sm text-white">{request.profiles?.phone || "N/A"}</p>
                </div>
              </div>

              {/* Schedule & Timestamps */}
              <div className="space-y-4">
                {request.scheduled_start && (
                  <div>
                    <div className="flex items-center gap-2 text-gray-400 text-xs uppercase tracking-wide mb-2">
                      <Calendar className="h-3 w-3" />
                      Scheduled
                    </div>
                    <p className="text-sm text-white">
                      {format(new Date(request.scheduled_start), "d MMM yyyy")}
                    </p>
                    <p className="text-xs text-gray-400">
                      {format(new Date(request.scheduled_start), "h:mm a")}
                      {request.scheduled_end && <> - {format(new Date(request.scheduled_end), "h:mm a")}</>}
                    </p>
                  </div>
                )}
                {request.collected_at && (
                  <div>
                    <div className="flex items-center gap-2 text-gray-400 text-xs uppercase tracking-wide mb-2">
                      <Clock className="h-3 w-3" />
                      Collected
                    </div>
                    <p className="text-sm text-white">
                      {format(new Date(request.collected_at), "d MMM yyyy, h:mm a")}
                    </p>
                    {request.collected_by_name && (
                      <p className="text-xs text-gray-400">by {request.collected_by_name}</p>
                    )}
                  </div>
                )}
                {request.preferred_window && request.preferred_window !== 'anytime' && (
                  <div>
                    <div className="flex items-center gap-2 text-gray-400 text-xs uppercase tracking-wide mb-2">
                      <Clock className="h-3 w-3" />
                      Preferred Window
                    </div>
                    <p className="text-sm text-white capitalize">{request.preferred_window}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Photos */}
            {request.request_photos && request.request_photos.length > 0 && (
              <div className="mt-4 pt-4 border-t border-[#333]">
                <div className="flex items-center gap-2 text-gray-400 text-xs uppercase tracking-wide mb-3">
                  <Camera className="h-3 w-3" />
                  Photos ({request.request_photos.length})
                </div>
                <div className="flex gap-2 flex-wrap">
                  {request.request_photos.map((photo, index) => {
                    const photoSignedUrl = signedUrlMap.get(photo.file_url);
                    return (
                      <div key={photo.id || index} className="relative">
                        {photoSignedUrl ? (
                          <img
                            src={photoSignedUrl}
                            alt={`Photo ${index + 1}`}
                            className="h-16 w-16 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="h-16 w-16 rounded-lg bg-[#28292b] flex items-center justify-center">
                            <Camera className="h-4 w-4 text-gray-500" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </td>
        </tr>
      )}
    </React.Fragment>
  );
}
