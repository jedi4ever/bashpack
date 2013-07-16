#!/bin/bash

# Remember the current dir = the temp extraction folder
tempdir=`pwd`

# We get passed the dir where the '.run' file whas started
cwd=$1
shift

# Second arg is the javascript to execute
jsfile=`pwd`/$1
shift

# Now we go back to the '.run' directory
cd $cwd

# And launch our own node with the javascript in the tempdir 
# And pass all the arguments left
PATH=$tempdir/.bashpack/bin:$PATH
exec node $jsfile $@
