
source:
https://docs.npmjs.com/cli/v9/commands/npm-link

DIR="~/developer/Documents/Development/social-site-demo"
cd $DIR/backend_api_types		# go into the package directory
npm link						# creates global link
cd $DIR/backend_api				# go into some other package directory.
npm link backend_api_types		# link-install the package


DIR="/home/developer/Documents/Development/social-site-demo"
cd $DIR/backend_api_types
npm link
cd $DIR/backend_api
npm link backend_api_types
cd $DIR/frontend_ts
npm link backend_api_types

