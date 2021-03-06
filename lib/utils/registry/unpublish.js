
// fetch the data
// modify to remove the version in question
// If no versions remaining, then DELETE
// else, PUT the modified data
// delete the tarball

module.exports = unpublish

var request = require("./request")
  , log = require("../log")
  , get = require("./get")
  , semver = require("semver")

function unpublish (name, ver, cb) {
  if (!cb) cb = ver, ver = null
  if (!cb) throw new Error(
    "Not enough arguments for registry unpublish")
  get(name, null, -1, true, function (er, data) {
    if (er) return log(name+" not published", "unpublish", cb)
    // remove all if no version specified
    if (!ver) {
      log("No version specified, removing all", "unpublish")
      return request("DELETE", name+'/-rev/'+data._rev, cb)
    }
    var versions = data.versions || {}
      , versionPublic = versions.hasOwnProperty(ver)
    if (!versionPublic) log(name+"@"+ver+" not published", "unpublish")
    delete versions[ver]
    // if it was the only version, then delete the whole package.
    if (!Object.keys(versions).length) {
      log("No versions remain, removing entire package", "unpublish")
      return request("DELETE", name+'/-rev/'+data._rev, cb)
    }
    if (!versionPublic) return cb()
    var latestVer = data["dist-tags"].latest
    for (var tag in data["dist-tags"]) {
      if (data["dist-tags"][tag] === ver) delete data["dist-tags"][tag]
    }
    if (latestVer === ver) {
      data["dist-tags"].latest =
        Object.getOwnPropertyNames(versions).sort(semver.compare).pop()
    }
    var rev = data._rev
    delete data._revisions
    delete data._attachments
    // log(data._rev, "rev")
    request.PUT(name+"/-rev/"+rev, data,
      log.er(detacher(data, ver, cb), "Failed to update the data"))
  })
}
function detacher (data, version, cb) { return function (er) {
  if (er) return cb(er)
  get(data.name, function (er, data) {
    if (er) return cb(er)

    // delete the attachment
    var attpref = encodeURIComponent(data.name)
                + "/-/"
                + encodeURIComponent(data.name)
      , attsuff = encodeURIComponent(version)
                + ".tgz"
                + "/-rev/"
                + encodeURIComponent(data._rev)
      , attURI = attpref + "-" + attsuff
    request("DELETE", attURI, cb)
  })
}}
