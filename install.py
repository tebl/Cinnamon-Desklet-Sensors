#!/usr/bin/python3

import argparse
import json
import shutil
import subprocess
import zipfile 
import os
from pathlib import Path

DESKLETS_PATH = f'{Path.home()}/.local/share/cinnamon/desklets/'

def copy_xlet(uuid):
    """
    Copy the UUID directory and action file for testing purposes
    """
    uuid_path = f'{uuid}/files/{uuid}'
    destination = f'{DESKLETS_PATH}{uuid}'

    try:
        shutil.copytree(uuid_path, destination, dirs_exist_ok=True)
        reload_xlet(f'{uuid}')
        print_info("Desklet installed OK", destination)
    except (FileNotFoundError, KeyError):
        # metadata.json file not found or missing valid keys
        pass


def reload_xlet(uuid):
    """
    Reloads the Spice via DBus
    """
    args = ['/usr/bin/cinnamon-dbus-command', 'ReloadXlet', uuid, 'DESKLET']
    out = subprocess.run(args, check=False,
                         stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    if out.returncode != 0:
        print(out.stderr.decode('ascii') + '\nReload error!')


def package_xlet(uuid):
    uuid_path = f'{uuid}/files/{uuid}'
    zip_path = get_package_path(uuid, uuid_path)
    with zipfile.ZipFile(zip_path, 'w') as zip_file:
        for root, dirs, files in os.walk(uuid_path):
            for file in files:
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, start=os.path.dirname(uuid_path))
                zip_file.write(file_path, arcname, compress_type=zipfile.ZIP_DEFLATED)
    print_info("Package created OK", zip_path)


def get_package_path(uuid, uuid_path):
    shortname = uuid.split('@')[0]
    version = get_version(uuid_path)
    return f'{shortname}-{version}.zip'


def get_version(uuid_path):
    metadata_file = f'{uuid_path}/metadata.json'

    with open(metadata_file, 'r', encoding='utf-8') as metadata:
        data = json.load(metadata)
        metadata.seek(0)
        return data['version']
    
    raise Exception('Unable to get version number from metadata.json')


def get_uuid():
    for root, dirs, files in os.walk('.'):
        for dir in dirs:
            if dir.count('@') == 1:
                uuid = dir
                uuid_metadata = f'{uuid}/files/{uuid}/metadata.json'

                if os.path.isfile(uuid_metadata):
                    print_info("UUID detected", uuid)
                    return uuid
        break
    raise Exception('Unable to get UUID')


def print_info(key, value):
    print((key + ":").ljust(22, ' '), value)


def main():
    """
    Desklet installation and packaging, adapted from test-spice script supplied
    with Cinnamon-repositories.
    """
    parser = argparse.ArgumentParser()
    parser.description = 'Desklet installation and packaging'
    parser.add_argument('-i', '--install', action='store_true', help='Install desklet for current user')
    parser.add_argument('-z', '--zip', action='store_true', help='Package desklet for release')
    args = parser.parse_args()

    if args.install:
        copy_xlet(get_uuid())
    elif args.zip:
        package_xlet(get_uuid())
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
