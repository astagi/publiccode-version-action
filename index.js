const core = require("@actions/core")
const yaml = require('js-yaml');
const fs = require('fs');
const simpleGit = require('simple-git');


let main = async () => {
  try {
    const currentRepoGit = simpleGit();
    const remoteRepo = core.getInput('remoterepo')
    const remotePath = `__ghapc_remote_${Math.random().toString(36).substring(2)}_path`
    if (remoteRepo) {
      await currentRepoGit.clone(remoteRepo, remotePath)
    }
    const checkDataGit = simpleGit(remoteRepo ? remotePath : null);
    const tag = (await checkDataGit.tags()).latest
    const publiccode = core.getInput('publiccode')
    let docContent = fs.readFileSync(publiccode, 'utf8')
    const doc = yaml.load(docContent)

    if (tag && doc.softwareVersion !== tag) {
      const tagDates = (await checkDataGit.tag(
        {"-l" : null, "--sort":"creatordate", "--format": "%(creatordate:short)"})
      ).split('\n').filter(el => el.length > 0)
      const tagDate = tagDates[tagDates.length - 1]
      core.info(tagDates)
      core.info(`Current tag of this repo is ${tag} - (${tagDate})`)
      core.setOutput("version", tag);
      core.setOutput("releaseDate", tagDate);
      currentRepoGit.addConfig('user.name', core.getInput('gitname')) 
      currentRepoGit.addConfig('user.email', core.getInput('gitmail'))
      docContent = docContent.replace(/softwareVersion:.*/, `softwareVersion: ${tag}`)
      docContent = docContent.replace(/releaseDate:.*/, `releaseDate: '${tagDate}'`)
      fs.writeFileSync(publiccode, docContent, 'utf8')
      fs.rmdirSync(remotePath, { recursive: true });
      currentRepoGit.add('.').commit(`feat: bump ${publiccode} to version ${tag}`)
      throw `Current ${publiccode} should contain ${tag} version`
    }
  }
  catch (error) {
    core.setFailed(error)
  }
}

main()