#!/usr/bin/env python3

from __future__ import print_function

import sys
import os
import codecs
import pickle
import errno
import random
try:
    import pickle5 as pickle
except:
    import pickle
    if sys.version_info < (3, 8):
        print('warning: pickle5 module could not be loaded and Python version is < 3.8,', file=sys.stderr)
        print('         newer Ren\'Py games may fail to unpack!', file=sys.stderr)
        if sys.version_info >= (3, 5):
            print('         if this occurs, fix it by installing pickle5:', file=sys.stderr)
            print('             {} -m pip install pickle5'.format(sys.executable), file=sys.stderr)
        else:
            print('         if this occurs, please upgrade to a newer Python (>= 3.5).', file=sys.stderr)
        print(file=sys.stderr)


if sys.version_info[0] >= 3:
    def _unicode(text):
        return text

    def _printable(text):
        return text

    def _unmangle(data):
        if type(data) == bytes:
            return data
        else:
            return data.encode('latin1')

    def _unpickle(data):
        # Specify latin1 encoding to prevent raw byte values from causing an ASCII decode error.
        return pickle.loads(data, encoding='latin1')
elif sys.version_info[0] == 2:
    def _unicode(text):
        if isinstance(text, unicode):
            return text
        return text.decode('utf-8')

    def _printable(text):
        return text.encode('utf-8')

    def _unmangle(data):
        return data

    def _unpickle(data):
        return pickle.loads(data)

class RenPyArchive:
    file = None
    handle = None

    files = {}
    indexes = {}

    version = None
    padlength = 0
    key = None
    verbose = False

    RPA2_MAGIC = 'RPA-2.0 '
    RPA3_MAGIC = 'RPA-3.0 '
    RPA3_2_MAGIC = 'RPA-3.2 '
    RPA4_MAGIC = 'RPA-4.0 '
    # Generic prefix for RenPy-style archives whose exact version banner we don't
    # special-case (RPA-4.0, vendor-custom RPA-3.x variants). These are parsed with
    # the v3 layout and an auto-detected obfuscation key (see extract_indexes).
    RPA_GENERIC_PREFIX = 'RPA-'

    # For backward compatibility, otherwise Python3-packed archives won't be read by Python2
    PICKLE_PROTOCOL = 2

    def __init__(self, file = None, version = 3, padlength = 0, key = 0xDEADBEEF, verbose = False):
        self.padlength = padlength
        self.key = key
        self.verbose = verbose

        if file is not None:
            self.load(file)
        else:
            self.version = version

    def __del__(self):
        if self.handle is not None:
            self.handle.close()

    # Determine archive version.
    def get_version(self):
        self.handle.seek(0)
        magic = self.handle.readline().decode('utf-8')

        if magic.startswith(self.RPA3_2_MAGIC):
            return 3.2
        elif magic.startswith(self.RPA3_MAGIC):
            return 3
        elif magic.startswith(self.RPA2_MAGIC):
            return 2
        elif magic.startswith(self.RPA_GENERIC_PREFIX):
            # RPA-4.0 and vendor-custom "RPA-x.y" banners: same on-disk layout as v3
            # (a zlib+pickle index at the header offset, offsets/lengths XOR-obfuscated
            # with a key built from the header subkeys). Treat as v3 and let
            # extract_indexes auto-detect the exact key. Reading works even when the
            # subkey arrangement differs from canonical 3.0.
            return 3
        elif self.file.endswith('.rpi'):
            return 1

        raise ValueError('the given file is not a valid Ren\'Py archive, or an unsupported version')

    # XOR a list of hex-string subkeys together into a single integer key.
    def _xor_subkeys(self, subkeys):
        key = 0
        for subkey in subkeys:
            key ^= int(subkey, 16)
        return key

    # Apply the v3 offset/length de-obfuscation with a given key.
    def _deobfuscate(self, obfuscated, key):
        result = {}
        for i in obfuscated.keys():
            if len(obfuscated[i][0]) == 2:
                result[i] = [ (offset ^ key, length ^ key) for offset, length in obfuscated[i] ]
            else:
                result[i] = [ (offset ^ key, length ^ key, prefix) for offset, length, prefix in obfuscated[i] ]
        return result

    # Candidate obfuscation keys to try, in order of likelihood. Covers canonical
    # 3.0 (XOR of subkeys from index 2), 3.2 (from index 3), each individual subkey
    # on its own (some vendor variants store the real key in a shifted position), and
    # 0 (unobfuscated). De-duplicated, order preserved.
    def _candidate_keys(self, vals):
        cands = []
        try:
            cands.append(self._xor_subkeys(vals[2:]))
        except (ValueError, IndexError):
            pass
        try:
            cands.append(self._xor_subkeys(vals[3:]))
        except (ValueError, IndexError):
            pass
        for subkey in vals[2:]:
            try:
                cands.append(int(subkey, 16))
            except ValueError:
                pass
        cands.append(0)
        seen = set()
        ordered = []
        for k in cands:
            if k not in seen:
                seen.add(k)
                ordered.append(k)
        return ordered

    # A key is plausible if every de-obfuscated segment points inside the archive.
    # A wrong key XORs the high bits of every offset/length, blowing them far past
    # the file size, so this discriminates the real key reliably.
    def _key_is_plausible(self, deobfuscated, filesize):
        checked = 0
        for i in deobfuscated.keys():
            for seg in deobfuscated[i]:
                offset = seg[0]
                length = seg[1]
                if offset < 0 or length < 0 or offset > filesize or length > filesize:
                    return False
                if offset + length > filesize + 64:  # tiny slack for prefix bytes
                    return False
                checked += 1
                if checked >= 64:  # a representative sample is enough
                    return True
        return checked > 0

    # Extract file indexes from opened archive.
    def extract_indexes(self):
        self.handle.seek(0)
        indexes = None

        if self.version in [2, 3, 3.2]:
            # Fetch metadata.
            metadata = self.handle.readline()
            vals = metadata.split()
            offset = int(vals[1], 16)

            # Load in indexes.
            self.handle.seek(offset)
            contents = codecs.decode(self.handle.read(), 'zlib')
            indexes = _unpickle(contents)

            # Deobfuscate indexes (v3 / v3.2 / RPA-4.0 / custom v3-like).
            if self.version in [3, 3.2]:
                try:
                    filesize = os.fstat(self.handle.fileno()).st_size
                except OSError:
                    filesize = offset
                obfuscated_indexes = indexes

                # Auto-detect the obfuscation key: pick the first candidate whose
                # de-obfuscated offsets land inside the archive. Falls back to the
                # canonical derivation for the detected version if none validate.
                chosen = None
                for key in self._candidate_keys(vals):
                    candidate = self._deobfuscate(obfuscated_indexes, key)
                    if self._key_is_plausible(candidate, filesize):
                        self.key = key
                        chosen = candidate
                        break
                if chosen is None:
                    if self.version == 3.2:
                        self.key = self._xor_subkeys(vals[3:])
                    else:
                        self.key = self._xor_subkeys(vals[2:])
                    chosen = self._deobfuscate(obfuscated_indexes, self.key)
                indexes = chosen
        else:
            indexes = pickle.loads(codecs.decode(self.handle.read(), 'zlib'))

        return indexes

    # Generate pseudorandom padding (for whatever reason).
    def generate_padding(self):
        length = random.randint(1, self.padlength)

        padding = ''
        while length > 0:
            padding += chr(random.randint(1, 255))
            length -= 1

        return bytes(padding, 'utf-8')

    # Converts a filename to archive format.
    def convert_filename(self, filename):
        (drive, filename) = os.path.splitdrive(os.path.normpath(filename).replace(os.sep, '/'))
        return filename

    # Debug (verbose) messages.
    def verbose_print(self, message):
        if self.verbose:
            print(message)


    # List files in archive and current internal storage.
    def list(self):
        return list(self.indexes.keys()) + list(self.files.keys())

    # Check if a file exists in the archive.
    def has_file(self, filename):
        filename = _unicode(filename)
        return filename in self.indexes.keys() or filename in self.files.keys()

    # Read file from archive or internal storage.
    def read(self, filename):
        filename = self.convert_filename(_unicode(filename))

        # Check if the file exists in our indexes.
        if filename not in self.files and filename not in self.indexes:
            raise IOError(errno.ENOENT, 'the requested file {0} does not exist in the given Ren\'Py archive'.format(
                _printable(filename)))

        # If it's in our opened archive index, and our archive handle isn't valid, something is obviously wrong.
        if filename not in self.files and filename in self.indexes and self.handle is None:
            raise IOError(errno.ENOENT, 'the requested file {0} does not exist in the given Ren\'Py archive'.format(
                _printable(filename)))

        # Check our simplified internal indexes first, in case someone wants to read a file they added before without saving, for some unholy reason.
        if filename in self.files:
            self.verbose_print('Reading file {0} from internal storage...'.format(_printable(filename)))
            return self.files[filename]
        # We need to read the file from our open archive.
        else:
            # Read offset and length, seek to the offset and read the file contents.
            if len(self.indexes[filename][0]) == 3:
                (offset, length, prefix) = self.indexes[filename][0]
            else:
                (offset, length) = self.indexes[filename][0]
                prefix = ''

            self.verbose_print('Reading file {0} from data file {1}... (offset = {2}, length = {3} bytes)'.format(
                _printable(filename), self.file, offset, length))
            self.handle.seek(offset)
            return _unmangle(prefix) + self.handle.read(length - len(prefix))

    # Modify a file in archive or internal storage.
    def change(self, filename, contents):
        filename = _unicode(filename)

        # Our 'change' is basically removing the file from our indexes first, and then re-adding it.
        self.remove(filename)
        self.add(filename, contents)

    # Add a file to the internal storage.
    def add(self, filename, contents):
        filename = self.convert_filename(_unicode(filename))
        if filename in self.files or filename in self.indexes:
            raise ValueError('file {0} already exists in archive'.format(_printable(filename)))

        self.verbose_print('Adding file {0} to archive... (length = {1} bytes)'.format(
            _printable(filename), len(contents)))
        self.files[filename] = contents

    # Remove a file from archive or internal storage.
    def remove(self, filename):
        filename = _unicode(filename)
        if filename in self.files:
            self.verbose_print('Removing file {0} from internal storage...'.format(_printable(filename)))
            del self.files[filename]
        elif filename in self.indexes:
            self.verbose_print('Removing file {0} from archive indexes...'.format(_printable(filename)))
            del self.indexes[filename]
        else:
            raise IOError(errno.ENOENT, 'the requested file {0} does not exist in this archive'.format(_printable(filename)))

    # Load archive.
    def load(self, filename):
        filename = _unicode(filename)

        if self.handle is not None:
            self.handle.close()
        self.file = filename
        self.files = {}
        self.handle = open(self.file, 'rb')
        self.version = self.get_version()
        self.indexes = self.extract_indexes()

    # Save current state into a new file, merging archive and internal storage, rebuilding indexes, and optionally saving in another format version.
    def save(self, filename = None):
        filename = _unicode(filename)

        if filename is None:
            filename = self.file
        if filename is None:
            raise ValueError('no target file found for saving archive')
        if self.version != 2 and self.version != 3:
            raise ValueError('saving is only supported for version 2 and 3 archives')

        self.verbose_print('Rebuilding archive index...')
        # Fill our own files structure with the files added or changed in this session.
        files = self.files
        # First, read files from the current archive into our files structure.
        for file in list(self.indexes.keys()):
            content = self.read(file)
            # Remove from indexes array once read, add to our own array.
            del self.indexes[file]
            files[file] = content

        # Predict header length, we'll write that one last.
        offset = 0
        if self.version == 3:
            offset = 34
        elif self.version == 2:
            offset = 25
        archive = open(filename, 'wb')
        archive.seek(offset)

        # Build our own indexes while writing files to the archive.
        indexes = {}
        self.verbose_print('Writing files to archive file...')
        for file, content in files.items():
            # Generate random padding, for whatever reason.
            if self.padlength > 0:
                padding = self.generate_padding()
                archive.write(padding)
                offset += len(padding)

            archive.write(content)
            # Update index.
            if self.version == 3:
                indexes[file] = [ (offset ^ self.key, len(content) ^ self.key) ]
            elif self.version == 2:
                indexes[file] = [ (offset, len(content)) ]
            offset += len(content)

        # Write the indexes.
        self.verbose_print('Writing archive index to archive file...')
        archive.write(codecs.encode(pickle.dumps(indexes, self.PICKLE_PROTOCOL), 'zlib'))
        # Now write the header.
        self.verbose_print('Writing header to archive file... (version = RPAv{0})'.format(self.version))
        archive.seek(0)
        if self.version == 3:
            archive.write(codecs.encode('{}{:016x} {:08x}\n'.format(self.RPA3_MAGIC, offset, self.key)))
        else:
            archive.write(codecs.encode('{}{:016x}\n'.format(self.RPA2_MAGIC, offset)))
        # We're done, close it.
        archive.close()

        # Reload the file in our inner database.
        self.load(filename)

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description='A tool for working with Ren\'Py archive files.',
        epilog='The FILE argument can optionally be in ARCHIVE=REAL format, mapping a file in the archive file system to a file on your real file system. An example of this: rpatool -x test.rpa script.rpyc=/home/foo/test.rpyc',
        add_help=False)

    parser.add_argument('archive', metavar='ARCHIVE', help='The Ren\'py archive file to operate on.')
    parser.add_argument('files', metavar='FILE', nargs='*', action='append', help='Zero or more files to operate on.')

    parser.add_argument('-l', '--list', action='store_true', help='List files in archive ARCHIVE.')
    parser.add_argument('-x', '--extract', action='store_true', help='Extract FILEs from ARCHIVE.')
    parser.add_argument('-c', '--create', action='store_true', help='Creative ARCHIVE from FILEs.')
    parser.add_argument('-d', '--delete', action='store_true', help='Delete FILEs from ARCHIVE.')
    parser.add_argument('-a', '--append', action='store_true', help='Append FILEs to ARCHIVE.')

    parser.add_argument('-2', '--two', action='store_true', help='Use the RPAv2 format for creating/appending to archives.')
    parser.add_argument('-3', '--three', action='store_true', help='Use the RPAv3 format for creating/appending to archives (default).')

    parser.add_argument('-k', '--key', metavar='KEY', help='The obfuscation key used for creating RPAv3 archives, in hexadecimal (default: 0xDEADBEEF).')
    parser.add_argument('-p', '--padding', metavar='COUNT', help='The maximum number of bytes of padding to add between files (default: 0).')
    parser.add_argument('-o', '--outfile', help='An alternative output archive file when appending to or deleting from archives, or output directory when extracting.')

    parser.add_argument('-h', '--help', action='help', help='Print this help and exit.')
    parser.add_argument('-v', '--verbose', action='store_true', help='Be a bit more verbose while performing operations.')
    parser.add_argument('-V', '--version', action='version', version='rpatool v0.8', help='Show version information.')
    arguments = parser.parse_args()

    # Determine RPA version.
    if arguments.two:
        version = 2
    else:
        version = 3

    # Determine RPAv3 key.
    if 'key' in arguments and arguments.key is not None:
        key = int(arguments.key, 16)
    else:
        key = 0xDEADBEEF

    # Determine padding bytes.
    if 'padding' in arguments and arguments.padding is not None:
        padding = int(arguments.padding)
    else:
        padding = 0

    # Determine output file/directory and input archive
    if arguments.create:
        archive = None
        output = _unicode(arguments.archive)
    else:
        archive = _unicode(arguments.archive)
        if 'outfile' in arguments and arguments.outfile is not None:
            output = _unicode(arguments.outfile)
        else:
            # Default output directory for extraction is the current directory.
            if arguments.extract:
                output = '.'
            else:
                output = _unicode(arguments.archive)

    # Normalize files.
    if len(arguments.files) > 0 and isinstance(arguments.files[0], list):
        arguments.files = arguments.files[0]

    try:
        archive = RenPyArchive(archive, padlength=padding, key=key, version=version, verbose=arguments.verbose)
    except IOError as e:
        print('Could not open archive file {0} for reading: {1}'.format(archive, e), file=sys.stderr)
        sys.exit(1)

    if arguments.create or arguments.append:
        # We need this seperate function to recursively process directories.
        def add_file(filename):
            # If the archive path differs from the actual file path, as given in the argument,
            # extract the archive path and actual file path.
            if filename.find('=') != -1:
                (outfile, filename) = filename.split('=', 2)
            else:
                outfile = filename

            if os.path.isdir(filename):
                for file in os.listdir(filename):
                    # We need to do this in order to maintain a possible ARCHIVE=REAL mapping between directories.
                    add_file(outfile + os.sep + file + '=' + filename + os.sep + file)
            else:
                try:
                    with open(filename, 'rb') as file:
                        archive.add(outfile, file.read())
                except Exception as e:
                    print('Could not add file {0} to archive: {1}'.format(filename, e), file=sys.stderr)

        # Iterate over the given files to add to archive.
        for filename in arguments.files:
            add_file(_unicode(filename))

        # Set version for saving, and save.
        archive.version = version
        try:
            archive.save(output)
        except Exception as e:
            print('Could not save archive file: {0}'.format(e), file=sys.stderr)
    elif arguments.delete:
        # Iterate over the given files to delete from the archive.
        for filename in arguments.files:
            try:
                archive.remove(filename)
            except Exception as e:
                print('Could not delete file {0} from archive: {1}'.format(filename, e), file=sys.stderr)

        # Set version for saving, and save.
        archive.version = version
        try:
            archive.save(output)
        except Exception as e:
            print('Could not save archive file: {0}'.format(e), file=sys.stderr)
    elif arguments.extract:
        # Either extract the given files, or all files if no files are given.
        if len(arguments.files) > 0:
            files = arguments.files
        else:
            files = archive.list()

        # Create output directory if not present.
        if not os.path.exists(output):
            os.makedirs(output)

        # Iterate over files to extract.
        for filename in files:
            if filename.find('=') != -1:
                (outfile, filename) = filename.split('=', 2)
            else:
                outfile = filename

            try:
                contents = archive.read(filename)

                # Create output directory for file if not present.
                if not os.path.exists(os.path.dirname(os.path.join(output, outfile))):
                    os.makedirs(os.path.dirname(os.path.join(output, outfile)))

                with open(os.path.join(output, outfile), 'wb') as file:
                    file.write(contents)
            except Exception as e:
                print('Could not extract file {0} from archive: {1}'.format(filename, e), file=sys.stderr)
    elif arguments.list:
        # Print the sorted file list.
        list = archive.list()
        list.sort()
        for file in list:
            print(file)
    else:
        print('No operation given :(')
        print('Use {0} --help for usage details.'.format(sys.argv[0]))

