expect-ssh
==========

expect-ssh is an [expect](http://expect.sourceforge.net/) script that wraps ssh to accomplish consistent bash shell
settings when ssh-ing to remote servers. If you have ever spent lots of time setting up your shell
with the perfect settings for .bashrc, .bash_profile, .vimrc, etc., and then
found yourself mass-copying these files to other machines you ssh to, then having to
deal with changing any of your preferences and now having to manually propagate
those changes out to those ssh sites, then this script presents a solution to
avoid those types of headaches.

# Requirements

* Support for running on Linux and Mac OS X (though mostly built/tested on just Linux)
* Assumes you use bash as your main shell
* Depends on some basic standard Unix programs like gzip, grep, cut
* Also must have openssl installed

# How it works

**Step 1: identify your profile.** Start by creating a **profile** (see below), or using an existing profile. My personal profile is the only one so far, called `profile.lenio`.

**Step 2: set up your rcfile.** The rcfile is `$HOME/.expect-ssh/config`. This is sourced by expect-ssh at init time. It may contain any valid expect commands, but in particular you should make a unique password for yourself like so:

    set MYBASHPREFS_PASSWORD 2sCuk5iVuRXrGmmUjLfwFj8fZSsoldML

**Step 3: ssh to a remote system.** Run the following to start a new ssh session:

    expect-ssh myserver.example.com
    
At the first shell prompt in the ssh session, expect-ssh will proceed to upload expect-ssh core functions to the remote system, plus the profile's basic settings from `.bashrc`. Why not upload the entire profile and all of your preferences? To save time, because otherwise you have to wait for everything to upload. expect-ssh will only upload the minimally necessary files it needs at the moment.

## Caching

Any time expect-ssh uploads profile files to a remote server, it will cache them under `/tmp/.expect-ssh-x.x`. Each cached file is AES256 encrypted with a password derived from a combination of your personal password (`MYBASHPREFS_PASSWORD`) and the MD5 of the file. The next time you ssh to the same system, expect-ssh attempts to use the cached version first, automatically supplying the password to decrypt it on the remote end. expect-ssh will automatically re-upload and re-cache the file if any of the following happen:

* the cached file is deleted
* the password supplied by expect-ssh fails to decrypt the file for any reason

The latter is typically indicative that the original profile file was changed: since the password depends on the MD5 of the file, changing the original file immediately changes the required password on the remote end. This solves the problem of keeping your preferences in sync on multiple systems.

Initially in your ssh session, all of the profile's bash functions are created as stubs: calling one of them will cause expect-ssh to first attempt to decrypt and use a cached version of the function. If the decryption fails for any reason, expect-ssh just re-uploads (or uploads for the first time) a fresh copy and re-caches it too.

# Profiles

A profile is a subdirectory off of the git checkout of expect-ssh containing a set of bash command files and expect files to fine-tune your bash shell. The subdirectory naming convention is `profile.ID`, where `ID` is some identifier to indicate who the profile was created for, or what it tries to achieve. Files in the profile:

* `*.exp`: expect commands that get sourced when expect-ssh starts up, these are usually for registering new markers and handlers (see below)
* you should have at least one .exp file that defines your PS1 marker as variable `EXPECTSSH_PS1_TAIL` (more on that variable below)
* any filename matching `^\w+` is assumed to be bash commands that usually, but not necessarily, define a bash function of the same name.
* `.bashrc`: this does what you would think for a normal .bashrc file

## Markers and handlers

Each marker is a small pattern that the main expect loop in expect-ssh will
detect and then trigger the marker's handler.

Markers invoke handlers by using the `_ES_send_marker` bash function like so:

    local marker=$(_ES_marker MARKER_HUMAN_FRIENDLY_NAME)
    _ES_send_marker "$marker" "any paramaters here ..."

Handlers can utilize the following global variables:

* OS: output from `uname -s`, e.g. `Linux` or `Darwin`
* PROMPT: holds the regex to detect a bash prompt
* EXPECTSSH_TMPDIR: temporary storage directory
* EXPECTSSH_PROFILE: directory of the current profile
* EXPECTSSH_FUNCTIONS_DIR

A handler can expect a single arg to be passed to it.  The format of this data
is up to you to define: it is the 2nd arg shown above with `_ES_send_marker`.

## Detecting a prompt

expect-ssh heavily depends on being able to detect a shell prompt. This is handled by configuring the variable `EXPECTSSH_PS1_TAIL`. This defines a unique pattern at the **end** of your bash PS1 prompt. It should be unique "enough" so that whenever expect-ssh detects this pattern, it can be assured that it really has detected a real shell prompt (and not just someone typing in these characters). The **profile.lenio** profile uses the following value:

    set EXPECTSSH_PS1_TAIL {:\033[7m\$\033[0m }

Let's break that down: the end of the PS1 prompt will consist of a colon, then the ANSI escape sequence to do reverse video, then an escaped dollar sign ([man bash](http://linux.die.net/man/1/bash), see PROMPTING section for details), then the ANSI escape sequence to reset the colors/attributes back to defaults, then a space.

## Overriding profile files

Profile files may be overridden simply by putting files under `$HOME/.expect-ssh/PROFILEID`, where `PROFILEID` is the name of the profile currently being used.

## Vim copy/paste

The default profile **profile.lenio** includes a keyboard based copy/paste facility for vim. This is really handy when inside GNU screen and you want to quickly copy/paste between 2 screen windows. To use:

* go into vim's [visual mode](http://vimdoc.sourceforge.net/htmldoc/visual.html) by pressing `v`
* do vim cursor motion sequences to select the desired text
* press ctrl-C to copy
* switch to the other window (which is presumably also running vim)
* put the cursor at the position you want to paste to
* press ctrl-V

Copying text actually copies to the X windows primary selection (system clipboard if on Mac), so you can also ctrl-V (command-V if on Mac) the selected text from vim into some other application.

## Other core bash functions

The following core bash functions are system level and are therefore usable under any profile.

* `download`: run this to download a file from remote ssh session to the system that invoked expect-ssh
* `copy_to_clipboard`: takes 1 argument: the name of a file to be copied to the clipboard. Or if no file is supplied, it reads from stdin.

## Other notes

Bash command files can use the following helper functions/environment variables:

* `_ES_marker`
* `EXPECTSSH_LOADED_FUNCS`: a space separated list of functions that have been loaded into the current shell
* `EXPECTSSH_SHLVL`: similar to bash's SHLVL

Expect files can use the following helper functions:

* `_ES_register_marker`

Handlers should not have a return value, else the procedure that invokes the
handler will flag it as an error.
