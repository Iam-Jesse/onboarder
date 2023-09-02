const { readFile } = require('fs')

const readCSVFile = (entity_name, callback) => {
  readFile('./files/ACRA_entities.csv', 'utf8', (error, textContent) => {
    if (error) {
      console.log('error ', error)
      throw error
    }
    const parsedData = textContent.split('\n')
    let available = true
    for (let i = 0; i < parsedData.length; i++) {
      const lowerData = parsedData[i].toLowerCase()
      if (lowerData.includes(entity_name.toLowerCase())) {
        console.log(lowerData)
        available = false
        break
      }
    }

    callback(available)
  })
}

module.exports = {
  readCSVFile,
}
