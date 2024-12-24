#!/usr/bin/bash
#
# Firefox or Thunderbird update and build on all branches if committed and
# pushed once to the "current" "work" branch (latest branch for *-z releases).
# If that branch changes, adapt $myDefaultBranch and add new branches to the
# case/esac. Also remove EOL branches there.
# Further maintenance is needed when branching off from c8s/c9s.

set -e

# Current z-stream work branch:
myDefaultBranch="rhel-9.2.0"
myDefaultOrigin="origin/${myDefaultBranch}"

function helpthem() {
    echo ""
    echo "Usage: $0 [--no-build] [--edit|--no-edit] [--from-branch=branchname] [--only=rhel] [--start=rhel] [since-commit-on-branch-${myDefaultOrigin}]"
    echo ""
    echo "        Default commit is top commit on ${myDefaultOrigin} ."
    cat <<EOH1
        If --from-branch=branchname is given, it will be commit(s) on
        origin/branchname instead.

        If --no-build is given, only cherry-picks are executed.

        If --edit is given (default), cherry-picked commit messages are edited
        prior to committing, e.g. to adjust bug references for the target
        branch.

        If --no-edit is given, cherry-picked commit messages are not edited.

        If --only=rhel is given, where rhel is 9.3 or 8.9 or ..., only that one
        branch will be cherry-picked to (and built).

        If --start=rhel is given, sequence starts at that rhel version. Could
        be used if an (e.g. merge) error occurred that needed to be fixed and
        continued manually, and afterwards this sequence is to be resumed with
        the next branch.
        If --only=rhel is given, the --start=rhel option is ignored.

        Since-commit-on-branch can be a sha1 on that branch.
        Or, default but could still be specified for one single commit:
EOH1
    echo "        ${myDefaultOrigin}"
    echo "        Or for the last 3 commits: ${myDefaultOrigin}~2"
    cat <<EOH2
        You get the idea..

EOH2
    exit 1
}

myBranch="${myDefaultBranch:?}"
myOrigin="${myDefaultOrigin:?}"
myNoBuild=0
myEdit="default"
myOnlyRhel=''
# Start with rhel version:
myRhel="9.3"

CHECK=''
while [[ "${1:0:2}" == "--"  || "${1:0:1}" == "-" ]]; do
    [[ "$1" == "--" ]] && { shift; break; }
    PARAM="${1%%=*}"
    if [[ "$PARAM" == "$1" ]]; then
        ARG=
    else
        ARG="${1#*=}"
    fi
    case "$PARAM" in
        --no-build)
            [[ -z "$ARG" ]] || { echo "$0: $PARAM does not expect argument."; CHECK="$CHECK $1"; }
            myNoBuild=1
            printf "\nNot building!\n"
            ;;
        --edit)
            [[ -z "$ARG" ]] || { echo "$0: $PARAM does not expect argument."; CHECK="$CHECK $1"; }
            if [[ "$myEdit" == "default" || "$myEdit" == "--edit" ]]; then
                myEdit="--edit"
            else
                echo "$0: contradicting $PARAM option."
                CHECK="$CHECK $myEdit $1"
            fi
            ;;
        --no-edit)
            [[ -z "$ARG" ]] || { echo "$0: $PARAM does not expect argument."; CHECK="$CHECK $1"; }
            if [[ "$myEdit" == "default" || "$myEdit" == "" ]]; then
                unset myEdit
            else
                echo "$0: contradicting $PARAM option."
                CHECK="$CHECK $myEdit $1"
            fi
            ;;
        --from-branch)
            [[ -z "$ARG" ]] && { echo "$0: $PARAM needs branchname argument."; CHECK="$CHECK $1"; }
            myBranch="$ARG"
            myOrigin="origin/${myBranch:?}"
            ;;
        --only)
            [[ -z "$ARG" ]] && { echo "$0: $PARAM needs rhel argument."; CHECK="$CHECK $1"; }
            myOnlyRhel="$ARG"
            ;;
        --start)
            [[ -z "$ARG" ]] && { echo "$0: $PARAM needs rhel argument."; CHECK="$CHECK $1"; }
            myRhel="$ARG"
            ;;
        --help|-h)
            helpthem
            ;;
        *)
            echo "$0: unknown option: $1"; CHECK="$CHECK $1"
            ;;
    esac
    shift
done
[[ -n "$CHECK" ]] && { echo "$0: error in $CHECK"; helpthem; }

# Catch extraneous unhandled arguments.
[[ $# -gt 1 ]] && helpthem

if [[ "$myEdit" == "default" ]]; then
    myEdit="--edit"
fi

if [[ -n "$myOnlyRhel" ]]; then
    myRhel="$myOnlyRhel"
fi

# Default the pushed top commit on the work branch.
myCommit="${1:-${myOrigin:?}}"

dir="$(pwd)"
myPackage="$(basename ${dir})"
[[ ${myPackage} = 'firefox' || ${myPackage} = 'thunderbird' ]] || { echo 'Package dir not firefox or thunderbird.'; exit 1; }

myPick="${myCommit:?}^..${myOrigin:?}"
echo ''
echo "For package ${myPackage} are available on ${myOrigin:?} (only top 5 shown):"
git log -5 --format=format:'%h (%cd, %cr) %s' --date=iso "${myOrigin:?}"
echo ''
echo 'Picked will be:'
git log --oneline "${myPick:?}"
echo ''
echo 'If this is what you want and everything needed, hit Enter; else Ctrl+C'
read

function pickandbuild() {
    [[ -n "$1" ]] || { echo "Missing branch target in pickandbuild()"; exit 1; }
    local theBranch="$1"
    local pickOptions=$2
    if [[ "${theBranch:?}" == "${myBranch:?}" ]]; then
        echo "Skipping picking to and building ${theBranch:?} == from-branch"
        return
    fi
    echo "Branch ${theBranch:?}"
    rhpkg switch-branch "${theBranch:?}" && rhpkg pull && \
        git cherry-pick ${pickOptions} ${myEdit} "${myPick:?}" && rhpkg push && \
        { [[ ${myNoBuild:?} -eq 1 ]] || \
            rhpkg build --target="${theBranch:?}-z-${myPackage:?}-esr-115-stack-gate" --nowait ; }
    local myRet=$?
    if [[ $myRet -ne 0 ]]; then
        echo "Command chain failed with return code $myRet."
        exit $myRet
    fi
    if [[ -n "$myOnlyRhel" ]]; then
        echo "Only processing rhel $myOnlyRhel."
        exit 0
    fi
}

function pickandbuild79() {
    if [[ "rhel-7.9" == "${myBranch:?}" ]]; then
        echo "Skipping picking to and building rhel-7.9 == from-branch"
        return
    fi
    echo 'Branch rhel-7.9'
    rhpkg switch-branch rhel-7.9 && rhpkg pull && \
        git cherry-pick -x ${myEdit} "${myPick:?}" && rhpkg push && \
        { [[ ${myNoBuild:?} -eq 1 ]] || \
            rhpkg build --target=rhel-7.9-z-"${myPackage:?}"-esr-115-stack-candidate --nowait ; }
    local myRet=$?
    if [[ $myRet -ne 0 ]]; then
        echo "Command chain failed with return code $myRet."
        exit $myRet
    fi
    if [[ -n "$myOnlyRhel" ]]; then
        echo "Only processing rhel $myOnlyRhel."
        exit 0
    fi
}

case "${myRhel:?}" in
# Not yet, still c9s. Next Y-release, no build until it becomes z-stream.
#    9.4)
#        pickandbuild rhel-9.4.0 -x
#        ;&
    9.3)
        pickandbuild rhel-9.3.0 -x
        ;&
    9.2)
        # Note no -x in cherry-pick to cherry-pick the resulting commit to c9s without "unknown sha1".
        pickandbuild rhel-9.2.0
        ;&
    9.0)
        pickandbuild rhel-9.0.0 -x
        ;&
# Not yet, still c8s. Next Y-release, no build until it becomes z-stream.
#    8.10)
#        # Note no -x in cherry-pick to cherry-pick the resulting commit to c8s without "unknown sha1".
#        pickandbuild rhel-8.10.0
#        ;&
    8.9)
        # Note no -x in cherry-pick to cherry-pick the resulting commit to c8s without "unknown sha1".
        pickandbuild rhel-8.9.0
        ;&
    8.8)
        pickandbuild rhel-8.8.0 -x
        ;&
    8.6)
        pickandbuild rhel-8.6.0 -x
        ;&
    8.4)
        pickandbuild rhel-8.4.0 -x
        ;&
    8.2)
        pickandbuild rhel-8.2.0 -x
        ;&
    7.9)
        pickandbuild79
        ;&
    x)
        # Switch back to work branch.
        rhpkg switch-branch "${myBranch:?}"
        ;;
    *)
        echo "Start with what rhel? ('${myRhel}' not defined, 8.6, 8.4, ...)."
        exit 1
        ;;
esac
