/*
global muxbots
*/

muxbots.onChat((message, callback) => {
  const signSet = new Set([
    'aries',
    'taurus',
    'gemini',
    'cancer',
    'leo',
    'virgo',
    'libra',
    'scorpio',
    'sagittarius',
    'capricorn',
    'aquarius',
    'pisces'
  ])
  message = message.toLocaleLowerCase()
  if (signSet.has(message)) {
    muxbots.localStorage.setItem('sign', message)
    muxbots.newResponse()
      .addMessage(`Got your sign as ${message}`)
      .addButton('See today\'s horoscope', 'show')
      .send(callback)
    return
  }

  if (message === 'show') {
    handleOnFeedPull(callback)
    return
  }

  muxbots.newResponse()
    .addNoResultsMessage('Please enter your astrological sign')
    .send(callback)
})

muxbots.onLoad((callback) => {
  let response = muxbots.newResponse()
  const sign = muxbots.localStorage.getItem('sign')
  if (sign) {
    response.addButton('See today\'s horoscope', 'show')
  } else {
    response.addNoResultsMessage('Please enter your astrological sign')
  }
  response.send(callback)
})

muxbots.onFeedPull((callback) => {
  handleOnFeedPull(callback)
})

const handleOnFeedPull = async (callback) => {
  const sign = muxbots.localStorage.getItem('sign')
  if (!sign) {
    muxbots.newResponse()
      .addNoResultsMessage('Please specify your astrological sign first')
      .send(callback)
    return
  }
  try {
    let horoscope = await getHoroscope(sign)
    if (!horoscope) {
      muxbots.newResponse()
        .addNoResultsMessage('No more horoscopes for today')
        .send(callback)
      return
    }

    let response = muxbots.newResponse()
    response.addMessage(horoscope.description)
    response.addWebpageSmall(muxbots.newWebpage()
      .setURL(horoscope.link)
      .setTitle(horoscope.title)
      .setImage(horoscope.imageURL))
    response.send(callback)
  } catch (error) {
    console.log(error)
    muxbots.newResponse()
      .addNoResultsMessage('An issue occurred while fetching horoscopes')
      .send(callback)
  }
}

const getHoroscope = async (sign) => {
  if (shouldFetchRSS(sign)) {
    const {pageContent, url} = await fetchHoroscopes(sign)
    const horoscope = parseHoroscope(pageContent, url)
    const currentDate = new Date()
    const currentDateWithSign = `${currentDate.toDateString}-${sign}`
    muxbots.localStorage.setItem('lastFetchDate', currentDateWithSign)
    return horoscope
  } else {
    return null
  }
}

const shouldFetchRSS = (sign) => {
  const lastFetchDate = muxbots.localStorage.getItem('lastFetchDate')
  if (lastFetchDate === undefined) {
    return true
  }
  const currentDate = new Date()
  const currentDateWithSign = `${currentDate.toDateString}-${sign}`
  return (currentDateWithSign !== lastFetchDate)
}

const fetchHoroscopes = async (sign) => {
  return new Promise((resolve, reject) => {
    const url = `https://www.astrology.com/horoscope/daily/${sign}.html`
    muxbots.http.get(url, (response) => {
      if (!response.data) {
        reject(response.error)
      }
      resolve({pageContent: response.data, url})
    })
  })
}

const parseHoroscope = (pageContent, url) => {
  const title = (/<meta property="og:title" content="(.*)">/.exec(pageContent))[1]
  const description = (/<meta property="og:description" content="(.*)">/.exec(pageContent))[1]
  const imageURL = (/<meta property="og:image" content="(.*)">/.exec(pageContent))[1]
  return { imageURL, link: url, title, description }
}
