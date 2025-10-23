# TODO
1. need to track at least the ipo date in order to know if cache is missing old data or simply the stock does not go back as far as the range asked.
1. improve file path template, bash interprets "$ticker$" as `<variable named ticker>$` which is undefined so then the file is saved as just `./path/to/file/$.csv`