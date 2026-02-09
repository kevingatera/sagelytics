'use client';

import { useState } from 'react';

export function LatestPost() {
  // The legacy post router is not enabled in this codebase.
  // Keep this component as a local demo widget.
  const [name, setName] = useState('');
  const [latestPost, setLatestPost] = useState<{ name: string } | null>(null);

  return (
    <div className="w-full max-w-xs">
      {latestPost ? (
        <p className="truncate">Your most recent post: {latestPost.name}</p>
      ) : (
        <p>You have no posts yet.</p>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          setLatestPost({ name });
          setName('');
        }}
        className="flex flex-col gap-2"
      >
        <input
          type="text"
          placeholder="Title"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-full px-4 py-2 text-black"
        />
        <button
          type="submit"
          className="rounded-full bg-white/10 px-10 py-3 font-semibold transition hover:bg-white/20"
          disabled={!name.trim()}
        >
          Submit
        </button>
      </form>
    </div>
  );
}
