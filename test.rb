require "watir"

file = "#{__dir__}/extension/chrome"

browser = Watir::Browser.new :chrome, switches: ["--load-extension=#{file}"]
browser.goto "https://www.google.com"

sleep 50