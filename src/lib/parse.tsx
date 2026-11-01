/// Parse helper from `path` package.
/// Core lib using the `next/image` wrappers.
/// Images and accessible media.

export const parse = Object.assign(
  {
    next: {
      basePath: undefined,
      publicPath: undefined,
      autoInject: true,
      staticImage: true,
      address: '',
      port: 3000,
    },
    path: {
      next: 'next/image',
      ignore: /^\/?\./,
    },
  },
  {
    parsePath: (basePath, targetPath) => `${basePath}/${targetPath}`,
    isAbsolute: (targetPath) => targetPath.startsWith('/'),
    isSameParent: (basePath, targetPath) =>
      targetPath.startsWith(basePath),
    stripPrefix: (basePath, targetPath) => {
      const prefix = basePath;
      if (!targetPath.startsWith(prefix)) {
        return targetPath;
      }
      const stripped = targetPath.slice(prefix.length);
      return stripped.startsWith('/') ? stripped.slice(1) : stripped;
    },
  },
);

/// This file is to be merged with the project at runtime.
/// Included because this is the entry point for the public-facing website,
/// but each page requires its own public-facing imports and
/// components.
/// Keep this simple, easy to understand, and visually appealing.
/// Keep components separate from routes.
/// Do not attempt to serve real clinical information.
