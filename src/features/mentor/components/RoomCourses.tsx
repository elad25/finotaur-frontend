// src/components/mentorship/RoomCourses.tsx
// Courses + Resources view for a Mentor Space.
//
// Layout (single scrollable column):
//   ── COURSES section ────────────────────────────────────────────────────────
//   List of DS Cards; clicking a card expands its lessons inline.
//   Each expanded lesson shows title, video embed / external link, content text.
//   isManager: "+ Add course" button (dialog), "+ Add lesson" button per card (dialog),
//              and trash-icon delete affordances.
//   ── RESOURCES section ──────────────────────────────────────────────────────
//   Compact rows with kind icon, title, optional description, external-link button.
//   isManager: "+ Add resource" button (dialog: title, url, kind select, description).

import { useState } from 'react';
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FileText,
  Link as LinkIcon,
  Map,
  Plus,
  Trash2,
} from 'lucide-react';
import { Card } from '@/components/ds/Card';
import { Button } from '@/components/ds/Button';
import { DataState } from '@/components/ds/DataState';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import {
  useRoomCourses,
  useRoomLessons,
  useRoomResources,
  useCreateCourse,
  useAddLesson,
  useCreateResource,
  useDeleteCourse,
  useDeleteResource,
} from '@/features/mentor/hooks/useSpaceCourses';
import { mapSpaceError } from '@/features/mentor/hooks/useMentorshipSpaces';
import type { RoomCourse, RoomLesson, RoomResource } from '@/features/mentor/hooks/useSpaceCourses';
import { cn } from '@/lib/utils';

// ── Props ─────────────────────────────────────────────────────────────────────

interface RoomCoursesProps {
  spaceId: string;
  isManager: boolean;
}

// ── Video embedding ────────────────────────────────────────────────────────────
//
// Security: we only embed iframes for explicitly allowlisted hostnames
// (YouTube and Vimeo). Any other URL is rendered as a plain external-link
// button. This prevents arbitrary iframe injection from user-supplied URLs.

type EmbedKind = { kind: 'youtube'; videoId: string }
               | { kind: 'vimeo'; videoId: string }
               | { kind: 'external'; url: string };

/**
 * Parses a video URL and returns the embed kind + safe embed URL.
 * Only YouTube and Vimeo produce an embeddable result; everything else
 * returns { kind: 'external' }. The returned embed URL is constructed
 * programmatically — the raw user URL is never placed in an iframe src.
 */
function parseVideoUrl(url: string): EmbedKind {
  let parsed: URL;
  try {
    // Reject non-https / non-http protocols (data:, javascript:, blob:, etc.)
    parsed = new URL(url);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return { kind: 'external', url };
    }
  } catch {
    return { kind: 'external', url };
  }

  const hostname = parsed.hostname.replace(/^www\./, '');

  // YouTube: youtube.com/watch?v=ID  |  youtu.be/ID  |  youtube.com/embed/ID
  if (hostname === 'youtube.com' || hostname === 'youtu.be') {
    const v =
      parsed.searchParams.get('v') ??
      (hostname === 'youtu.be' ? parsed.pathname.slice(1) : null) ??
      parsed.pathname.split('/').pop() ??
      '';
    // Validate: YouTube video IDs are 11 alphanumeric chars (incl. - and _)
    if (/^[A-Za-z0-9_-]{11}$/.test(v)) {
      return { kind: 'youtube', videoId: v };
    }
  }

  // Vimeo: vimeo.com/ID  |  vimeo.com/video/ID
  if (hostname === 'vimeo.com') {
    const parts = parsed.pathname.split('/').filter(Boolean);
    const idStr = parts[parts.length - 1] ?? '';
    // Vimeo video IDs are numeric (6–12 digits)
    if (/^\d{6,12}$/.test(idStr)) {
      return { kind: 'vimeo', videoId: idStr };
    }
  }

  return { kind: 'external', url };
}

// ── VideoEmbed ────────────────────────────────────────────────────────────────

function VideoEmbed({ videoUrl }: { videoUrl: string }) {
  const result = parseVideoUrl(videoUrl);

  if (result.kind === 'youtube') {
    // Safe: embed URL is constructed from a validated 11-char video ID only.
    const src = `https://www.youtube-nocookie.com/embed/${result.videoId}`;
    return (
      <div className="relative w-full" style={{ paddingTop: '56.25%' /* 16:9 */ }}>
        <iframe
          className="absolute inset-0 w-full h-full rounded-[8px]"
          src={src}
          title="Lesson video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    );
  }

  if (result.kind === 'vimeo') {
    // Safe: embed URL is constructed from a validated numeric video ID only.
    const src = `https://player.vimeo.com/video/${result.videoId}?dnt=1`;
    return (
      <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
        <iframe
          className="absolute inset-0 w-full h-full rounded-[8px]"
          src={src}
          title="Lesson video"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    );
  }

  // Fallback: non-embeddable URL — render as a safe external-link button.
  return (
    <a
      href={result.url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-ds-2 text-[13px] text-gold-primary hover:text-gold-hover transition-colors duration-base"
    >
      <ExternalLink size={14} aria-hidden="true" />
      Watch lesson
    </a>
  );
}

// ── LessonList (lazy-loaded per course on expansion) ──────────────────────────

interface LessonListProps {
  courseId: string;
  spaceId: string;
  isManager: boolean;
}

function LessonList({ courseId, spaceId, isManager }: LessonListProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonVideoUrl, setLessonVideoUrl] = useState('');
  const [lessonContent, setLessonContent] = useState('');

  const { lessons, isLoading, isError, error, refetch } = useRoomLessons(courseId);
  const addLesson = useAddLesson();

  function handleAddLesson() {
    if (!lessonTitle.trim()) return;
    addLesson.mutate(
      {
        courseId,
        spaceId,
        title: lessonTitle.trim(),
        videoUrl: lessonVideoUrl.trim() || undefined,
        content: lessonContent.trim() || undefined,
      },
      {
        onSuccess: () => {
          setAddOpen(false);
          setLessonTitle('');
          setLessonVideoUrl('');
          setLessonContent('');
          toast({ title: 'Lesson added.' });
        },
        onError: (err) => {
          toast({ title: 'Could not add lesson', description: mapSpaceError(err) });
        },
      },
    );
  }

  return (
    <div className="mt-ds-3 flex flex-col gap-ds-3">
      <DataState
        isLoading={isLoading}
        isError={isError}
        error={error}
        data={lessons}
        onRetry={refetch}
        empty={
          <p className="text-[13px] text-ink-tertiary py-ds-3">
            No lessons yet.{isManager ? ' Add the first one below.' : ''}
          </p>
        }
      >
        {(rows: RoomLesson[]) => (
          <div className="flex flex-col gap-ds-4">
            {rows.map((lesson) => (
              <div
                key={lesson.id}
                className="rounded-[8px] bg-surface-2 border-[0.5px] border-border-ds-subtle p-ds-4 flex flex-col gap-ds-3"
              >
                <p className="font-sans text-[14px] font-medium text-ink-primary">
                  {lesson.title}
                </p>
                {lesson.video_url && <VideoEmbed videoUrl={lesson.video_url} />}
                {lesson.content && (
                  <p className="font-sans text-[13px] text-ink-secondary leading-relaxed whitespace-pre-wrap">
                    {lesson.content}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </DataState>

      {isManager && (
        <>
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="inline-flex items-center gap-ds-1 text-[12px] text-gold-primary hover:text-gold-hover transition-colors duration-base self-start"
          >
            <Plus size={13} aria-hidden="true" />
            Add lesson
          </button>

          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogContent className="bg-surface-1 border-[0.5px] border-border-ds-subtle rounded-[12px] max-w-md">
              <DialogHeader>
                <DialogTitle className="text-ink-primary text-[16px] font-semibold">
                  Add lesson
                </DialogTitle>
              </DialogHeader>

              <div className="flex flex-col gap-ds-4 pt-ds-1">
                <div className="flex flex-col gap-ds-2">
                  <label className="text-[11px] font-medium tracking-[1.5px] uppercase text-gold-muted">
                    Title *
                  </label>
                  <input
                    className="w-full bg-surface-2 border-[0.5px] border-border-ds-default rounded-[8px] px-ds-4 py-[10px] text-[14px] text-ink-primary placeholder:text-ink-muted focus:outline-none focus:border-gold-primary transition-colors duration-base"
                    placeholder="Lesson title"
                    value={lessonTitle}
                    onChange={(e) => setLessonTitle(e.target.value)}
                    autoFocus
                  />
                </div>

                <div className="flex flex-col gap-ds-2">
                  <label className="text-[11px] font-medium tracking-[1.5px] uppercase text-gold-muted">
                    Video URL
                  </label>
                  <input
                    className="w-full bg-surface-2 border-[0.5px] border-border-ds-default rounded-[8px] px-ds-4 py-[10px] text-[14px] text-ink-primary placeholder:text-ink-muted focus:outline-none focus:border-gold-primary transition-colors duration-base"
                    placeholder="YouTube or Vimeo URL (optional)"
                    value={lessonVideoUrl}
                    onChange={(e) => setLessonVideoUrl(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-ds-2">
                  <label className="text-[11px] font-medium tracking-[1.5px] uppercase text-gold-muted">
                    Content
                  </label>
                  <textarea
                    className="w-full bg-surface-2 border-[0.5px] border-border-ds-default rounded-[8px] px-ds-4 py-[10px] text-[14px] text-ink-primary placeholder:text-ink-muted focus:outline-none focus:border-gold-primary transition-colors duration-base resize-none"
                    placeholder="Lesson notes or written content (optional)"
                    rows={4}
                    value={lessonContent}
                    onChange={(e) => setLessonContent(e.target.value)}
                  />
                </div>
              </div>

              <DialogFooter className="pt-ds-2">
                <Button
                  variant="goldOutline"
                  size="compact"
                  showArrow={false}
                  onClick={() => setAddOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="gold"
                  size="compact"
                  showArrow={false}
                  onClick={handleAddLesson}
                  disabled={!lessonTitle.trim() || addLesson.isPending}
                >
                  {addLesson.isPending ? 'Adding…' : 'Add lesson'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}

// ── CourseCard ────────────────────────────────────────────────────────────────

interface CourseCardProps {
  course: RoomCourse;
  spaceId: string;
  isManager: boolean;
}

function CourseCard({ course, spaceId, isManager }: CourseCardProps) {
  const [expanded, setExpanded] = useState(false);
  const deleteCourse = useDeleteCourse();

  function handleDelete() {
    deleteCourse.mutate(
      { courseId: course.id, spaceId },
      {
        onSuccess: () => toast({ title: 'Course deleted.' }),
        onError: (err) => toast({ title: 'Could not delete course', description: mapSpaceError(err) }),
      },
    );
  }

  return (
    <Card variant="default" padding="default" className="flex flex-col gap-ds-3">
      {/* Header row */}
      <div className="flex items-start justify-between gap-ds-3">
        <button
          type="button"
          className="flex items-start gap-ds-3 min-w-0 flex-1 text-left"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          <BookOpen
            size={16}
            className="shrink-0 mt-[2px] text-gold-primary"
            aria-hidden="true"
          />
          <div className="min-w-0">
            <p className="font-sans text-[15px] font-semibold text-ink-primary leading-snug">
              {course.title}
            </p>
            {course.description && (
              <p className="mt-[4px] font-sans text-[13px] text-ink-secondary leading-snug">
                {course.description}
              </p>
            )}
            <p className="mt-ds-2 font-sans text-[11px] font-medium tracking-[1.5px] uppercase text-gold-muted">
              {course.lesson_count} {course.lesson_count === 1 ? 'lesson' : 'lessons'}
            </p>
          </div>
        </button>

        <div className="flex items-center gap-ds-2 shrink-0">
          {isManager && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleteCourse.isPending}
              className="p-[6px] rounded-[6px] text-ink-tertiary hover:text-num-negative hover:bg-surface-2 transition-colors duration-base"
              aria-label={`Delete course "${course.title}"`}
            >
              <Trash2 size={14} aria-hidden="true" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="p-[6px] rounded-[6px] text-ink-tertiary hover:text-ink-secondary hover:bg-surface-2 transition-colors duration-base"
            aria-label={expanded ? 'Collapse lessons' : 'Expand lessons'}
          >
            {expanded
              ? <ChevronUp size={16} aria-hidden="true" />
              : <ChevronDown size={16} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {/* Expanded lesson panel */}
      {expanded && (
        <div className="border-t border-border-ds-subtle pt-ds-3">
          <LessonList courseId={course.id} spaceId={spaceId} isManager={isManager} />
        </div>
      )}
    </Card>
  );
}

// ── Resource kind icon ─────────────────────────────────────────────────────────

function KindIcon({ kind }: { kind: string | null }) {
  if (kind === 'file') return <FileText size={14} className="text-gold-muted shrink-0" aria-hidden="true" />;
  if (kind === 'playbook') return <Map size={14} className="text-gold-muted shrink-0" aria-hidden="true" />;
  // default / 'link' / null
  return <LinkIcon size={14} className="text-gold-muted shrink-0" aria-hidden="true" />;
}

// ── ResourceRow ───────────────────────────────────────────────────────────────

interface ResourceRowProps {
  resource: RoomResource;
  spaceId: string;
  isManager: boolean;
}

function ResourceRow({ resource, spaceId, isManager }: ResourceRowProps) {
  const deleteResource = useDeleteResource();

  function handleDelete() {
    deleteResource.mutate(
      { resourceId: resource.id, spaceId },
      {
        onSuccess: () => toast({ title: 'Resource deleted.' }),
        onError: (err) => toast({ title: 'Could not delete resource', description: mapSpaceError(err) }),
      },
    );
  }

  return (
    <div className="flex items-start gap-ds-3 py-[10px] border-b border-border-ds-subtle last:border-0">
      <KindIcon kind={resource.kind} />
      <div className="flex-1 min-w-0">
        <p className="font-sans text-[14px] font-medium text-ink-primary truncate">
          {resource.title}
        </p>
        {resource.description && (
          <p className="mt-[2px] font-sans text-[12px] text-ink-tertiary leading-snug">
            {resource.description}
          </p>
        )}
      </div>
      <div className="flex items-center gap-ds-2 shrink-0">
        <a
          href={resource.url}
          target="_blank"
          rel="noopener noreferrer"
          className="p-[6px] rounded-[6px] text-ink-tertiary hover:text-gold-primary hover:bg-surface-2 transition-colors duration-base"
          aria-label={`Open resource "${resource.title}"`}
        >
          <ExternalLink size={14} aria-hidden="true" />
        </a>
        {isManager && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleteResource.isPending}
            className="p-[6px] rounded-[6px] text-ink-tertiary hover:text-num-negative hover:bg-surface-2 transition-colors duration-base"
            aria-label={`Delete resource "${resource.title}"`}
          >
            <Trash2 size={14} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}

// ── SectionHeader ─────────────────────────────────────────────────────────────

function SectionHeader({
  label,
  onAdd,
  addLabel,
  showAdd,
}: {
  label: string;
  onAdd?: () => void;
  addLabel?: string;
  showAdd?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-ds-3">
      <h3 className="font-sans text-[13px] font-medium text-ink-secondary tracking-[0.5px] uppercase">
        {label}
      </h3>
      {showAdd && onAdd && (
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center gap-ds-1 text-[12px] text-gold-primary hover:text-gold-hover transition-colors duration-base"
        >
          <Plus size={13} aria-hidden="true" />
          {addLabel}
        </button>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function RoomCourses({ spaceId, isManager }: RoomCoursesProps) {
  // ── Courses state ──
  const { courses, isLoading: cLoading, isError: cError, error: cErr, refetch: cRefetch } =
    useRoomCourses(spaceId);
  const [addCourseOpen, setAddCourseOpen] = useState(false);
  const [courseTitle, setCourseTitle] = useState('');
  const [courseDesc, setCourseDesc] = useState('');
  const createCourse = useCreateCourse();

  // ── Resources state ──
  const { resources, isLoading: rLoading, isError: rError, error: rErr, refetch: rRefetch } =
    useRoomResources(spaceId);
  const [addResourceOpen, setAddResourceOpen] = useState(false);
  const [resTitle, setResTitle] = useState('');
  const [resUrl, setResUrl] = useState('');
  const [resKind, setResKind] = useState<'link' | 'file' | 'playbook'>('link');
  const [resDesc, setResDesc] = useState('');
  const createResource = useCreateResource();

  // ── Handlers ──

  function handleCreateCourse() {
    if (!courseTitle.trim()) return;
    createCourse.mutate(
      { spaceId, title: courseTitle.trim(), description: courseDesc.trim() || undefined },
      {
        onSuccess: () => {
          setAddCourseOpen(false);
          setCourseTitle('');
          setCourseDesc('');
          toast({ title: 'Course created.' });
        },
        onError: (err) => {
          toast({ title: 'Could not create course', description: mapSpaceError(err) });
        },
      },
    );
  }

  function handleCreateResource() {
    if (!resTitle.trim() || !resUrl.trim()) return;
    createResource.mutate(
      {
        spaceId,
        title: resTitle.trim(),
        url: resUrl.trim(),
        kind: resKind,
        description: resDesc.trim() || undefined,
      },
      {
        onSuccess: () => {
          setAddResourceOpen(false);
          setResTitle('');
          setResUrl('');
          setResKind('link');
          setResDesc('');
          toast({ title: 'Resource added.' });
        },
        onError: (err) => {
          toast({ title: 'Could not add resource', description: mapSpaceError(err) });
        },
      },
    );
  }

  return (
    <div className="flex flex-col gap-ds-6 px-ds-5 py-ds-5">

      {/* ── COURSES ─────────────────────────────────────────── */}
      <div className="flex flex-col gap-ds-4">
        <SectionHeader
          label="Courses"
          showAdd={isManager}
          addLabel="Add course"
          onAdd={() => setAddCourseOpen(true)}
        />

        <DataState
          isLoading={cLoading}
          isError={cError}
          error={cErr}
          data={courses}
          onRetry={cRefetch}
          empty={
            <Card variant="default" padding="default">
              <p className={cn(
                'font-sans text-[13px] text-ink-tertiary text-center py-ds-4',
              )}>
                No courses yet.
                {isManager && (
                  <> Use <span className="text-gold-primary">Add course</span> above to create the first one.</>
                )}
              </p>
            </Card>
          }
        >
          {(rows: RoomCourse[]) => (
            <div className="flex flex-col gap-ds-4">
              {rows.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  spaceId={spaceId}
                  isManager={isManager}
                />
              ))}
            </div>
          )}
        </DataState>
      </div>

      {/* ── RESOURCES ───────────────────────────────────────── */}
      <div className="flex flex-col gap-ds-4">
        <SectionHeader
          label="Resources"
          showAdd={isManager}
          addLabel="Add resource"
          onAdd={() => setAddResourceOpen(true)}
        />

        <DataState
          isLoading={rLoading}
          isError={rError}
          error={rErr}
          data={resources}
          onRetry={rRefetch}
          empty={
            <Card variant="default" padding="default">
              <p className="font-sans text-[13px] text-ink-tertiary text-center py-ds-4">
                No resources yet.
                {isManager && (
                  <> Use <span className="text-gold-primary">Add resource</span> above to add the first one.</>
                )}
              </p>
            </Card>
          }
        >
          {(rows: RoomResource[]) => (
            <div className="rounded-[12px] border-[0.5px] border-border-ds-subtle bg-surface-1 px-ds-4">
              {rows.map((r) => (
                <ResourceRow key={r.id} resource={r} spaceId={spaceId} isManager={isManager} />
              ))}
            </div>
          )}
        </DataState>
      </div>

      {/* ── Add Course Dialog ───────────────────────────────── */}
      <Dialog open={addCourseOpen} onOpenChange={setAddCourseOpen}>
        <DialogContent className="bg-surface-1 border-[0.5px] border-border-ds-subtle rounded-[12px] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-ink-primary text-[16px] font-semibold">
              Add course
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-ds-4 pt-ds-1">
            <div className="flex flex-col gap-ds-2">
              <label className="text-[11px] font-medium tracking-[1.5px] uppercase text-gold-muted">
                Title *
              </label>
              <input
                className="w-full bg-surface-2 border-[0.5px] border-border-ds-default rounded-[8px] px-ds-4 py-[10px] text-[14px] text-ink-primary placeholder:text-ink-muted focus:outline-none focus:border-gold-primary transition-colors duration-base"
                placeholder="Course title"
                value={courseTitle}
                onChange={(e) => setCourseTitle(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-ds-2">
              <label className="text-[11px] font-medium tracking-[1.5px] uppercase text-gold-muted">
                Description
              </label>
              <textarea
                className="w-full bg-surface-2 border-[0.5px] border-border-ds-default rounded-[8px] px-ds-4 py-[10px] text-[14px] text-ink-primary placeholder:text-ink-muted focus:outline-none focus:border-gold-primary transition-colors duration-base resize-none"
                placeholder="Short description (optional)"
                rows={3}
                value={courseDesc}
                onChange={(e) => setCourseDesc(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="pt-ds-2">
            <Button
              variant="goldOutline"
              size="compact"
              showArrow={false}
              onClick={() => setAddCourseOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="gold"
              size="compact"
              showArrow={false}
              onClick={handleCreateCourse}
              disabled={!courseTitle.trim() || createCourse.isPending}
            >
              {createCourse.isPending ? 'Creating…' : 'Create course'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add Resource Dialog ─────────────────────────────── */}
      <Dialog open={addResourceOpen} onOpenChange={setAddResourceOpen}>
        <DialogContent className="bg-surface-1 border-[0.5px] border-border-ds-subtle rounded-[12px] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-ink-primary text-[16px] font-semibold">
              Add resource
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-ds-4 pt-ds-1">
            <div className="flex flex-col gap-ds-2">
              <label className="text-[11px] font-medium tracking-[1.5px] uppercase text-gold-muted">
                Title *
              </label>
              <input
                className="w-full bg-surface-2 border-[0.5px] border-border-ds-default rounded-[8px] px-ds-4 py-[10px] text-[14px] text-ink-primary placeholder:text-ink-muted focus:outline-none focus:border-gold-primary transition-colors duration-base"
                placeholder="Resource title"
                value={resTitle}
                onChange={(e) => setResTitle(e.target.value)}
                autoFocus
              />
            </div>

            <div className="flex flex-col gap-ds-2">
              <label className="text-[11px] font-medium tracking-[1.5px] uppercase text-gold-muted">
                URL *
              </label>
              <input
                className="w-full bg-surface-2 border-[0.5px] border-border-ds-default rounded-[8px] px-ds-4 py-[10px] text-[14px] text-ink-primary placeholder:text-ink-muted focus:outline-none focus:border-gold-primary transition-colors duration-base"
                placeholder="https://…"
                value={resUrl}
                onChange={(e) => setResUrl(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-ds-2">
              <label className="text-[11px] font-medium tracking-[1.5px] uppercase text-gold-muted">
                Kind
              </label>
              <div className="flex items-center gap-ds-2">
                {(['link', 'file', 'playbook'] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setResKind(k)}
                    className={cn(
                      'flex items-center gap-[6px] px-ds-3 py-[6px] rounded-[6px]',
                      'font-sans text-[12px] font-medium capitalize',
                      'border-[0.5px] transition-colors duration-base',
                      resKind === k
                        ? 'border-gold-primary text-gold-primary bg-surface-2'
                        : 'border-border-ds-subtle text-ink-tertiary hover:border-border-ds-default hover:text-ink-secondary',
                    )}
                  >
                    {k === 'file' && <FileText size={12} aria-hidden="true" />}
                    {k === 'playbook' && <Map size={12} aria-hidden="true" />}
                    {k === 'link' && <LinkIcon size={12} aria-hidden="true" />}
                    {k}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-ds-2">
              <label className="text-[11px] font-medium tracking-[1.5px] uppercase text-gold-muted">
                Description
              </label>
              <input
                className="w-full bg-surface-2 border-[0.5px] border-border-ds-default rounded-[8px] px-ds-4 py-[10px] text-[14px] text-ink-primary placeholder:text-ink-muted focus:outline-none focus:border-gold-primary transition-colors duration-base"
                placeholder="Optional description"
                value={resDesc}
                onChange={(e) => setResDesc(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="pt-ds-2">
            <Button
              variant="goldOutline"
              size="compact"
              showArrow={false}
              onClick={() => setAddResourceOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="gold"
              size="compact"
              showArrow={false}
              onClick={handleCreateResource}
              disabled={!resTitle.trim() || !resUrl.trim() || createResource.isPending}
            >
              {createResource.isPending ? 'Adding…' : 'Add resource'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
