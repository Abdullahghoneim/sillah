const React = require('react');
const { View } = require('react-native');
function SvgMock(props: any) {
  return React.createElement(View, props);
}
module.exports = SvgMock;
module.exports.default = SvgMock;
