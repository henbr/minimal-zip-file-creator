# Minimal ZIP file creator library

This is an ES6 library containing the bare essentials for creating uncompressed ZIP files. The use case is mostly for when dealing with a lot small files or already compressed files, like images. The library can be used both in browsers and Node.js.

## Features

- Small (2.6 KiB minified, 1.1 KiB compressed)
- No dependencies
- Fast

## Example

```js
import { createZip } from "minimal-zip-file-creator";
import { saveAs } from "file-saver";

const zip = createZip([
  {
    name: "small_image.gif",
    content: new Uint8Array([
        71, 73, 70, 56, 57, 97, 1, 0, 1, 0, 0, 255, 0, 44, 0, 0, 0, 0, 1, 0, 1,
        0, 0, 2, 0, 59,
      ]),
  },
  {
    name: "folder/hello.txt",
    content: "Hello world!",
  },
  {
    name: "folder/old_hello.txt",
    content: "Hello world!",
    date: new Date("1980-01-01")
  },
]);

saveAs(new Blob(zip), "example.zip");
```

## API

### `createZip(files)`

#### Parameters

- `files`: Array of objects containing the data of the files to be added to the ZIP file. The object should contain the following fields:
  - `name`: Name of the file. If an UTF-8 character is detected the UTF-8 storage mode will be automatically enabled. Folders can be added using the following syntax: `"folder1/folder2/filename"`.
  - `content`: File content. This can be a `String`, `Uint8Array` or `ArrayBuffer`. `String` content will be encoded using UTF-8 encoding.
  - `date`: This field is optional and is used to specify the "last modified date" stored along the file in the ZIP. If omitted the current date will be used instead. This can be either a `Date` object or a `number`, specifying milliseconds since [epoch](https://developer.mozilla.org/en-US/docs/Glossary/Unix_time).

#### Return value

An `ArrayBuffer` containing the ZIP file content.

## Building

```sh
bun dist
```

## Performance

See [benchmark](./benchmark) for the source code of this benchmark.

### Chrome (120.0.6099.109)

```
benchmark                     time (avg)             (min … max)
----------------------------------------------------------------
minimal-zip-file-creator  128.56 ms/iter   (122.5 ms … 131.9 ms)
jzip                      457.46 ms/iter   (454.7 ms … 459.5 ms)
```

### Firefox (119.0.1)

```
benchmark                     time (avg)             (min … max)
----------------------------------------------------------------
minimal-zip-file-creator  195.62 ms/iter       (192 ms … 204 ms)
jzip                         270 ms/iter       (259 ms … 291 ms)
```

### Bun (1.0.18)

```
benchmark                     time (avg)             (min … max)
----------------------------------------------------------------
minimal-zip-file-creator   50.55 ms/iter   (48.24 ms … 79.98 ms)
jzip                      189.11 ms/iter  (185.1 ms … 216.73 ms)
archiver                   55.94 ms/iter   (47.46 ms … 88.53 ms)
```

## References

- ".ZIP File Format Specification", [https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT](https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT])
- "Fast CRC32", Stephan Brumme, [https://create.stephan-brumme.com/crc32/](https://create.stephan-brumme.com/crc32/)

## License

See the [LICENSE](LICENSE) file
