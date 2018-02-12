# uas-private-stat

**[Open the tool here](https://wellosoft.net/uas-private-stat)**

This is a tool to collect sales or free downloads data from [Asset Store Publisher](https://publisher.assetstore.unity3d.com) and analyze with beautiful yet simple line chart.

## Getting Started

1. [Open the tool](https://wellosoft.net/uas-private-stat)
2. Enter [publisher ID](https://i.imgur.com/uBFYQMA.png), start and end month, and the category (downloads or sales)
3. Click `Show Script Dialog`
4. Copy script on the left
5. Visit [publisher page](https://publisher.assetstore.unity3d.com) and login
6. Open DevTool (Ctrl + Shift + I) and open Console Tab
7. Paste the script and press Enter
8. Wait and paste the result on the right
9. See the magic yourself 👍

## Why getting data by injecting script

It simply because Asset Store Publisher does not provide public API for that. And to get access for it, you need to send the request with the right cookies, which only possible if the request is made by the publisher page itself.

Note that you can't get analytics from publishers other than yourself just by typing random publisher ID. Trust me, it won't work.

## Merging between different request dates

> TODO.

## Privacy

The data and its configuration are saved into `localStorage` and won't expire. You can comeback anytime without having to request again as long as you're using the same browser. I don't use cookies or analytics in this tool.

The script that you inject to console is totally secure. Feel free to read what it does if you familiar with Javascript.

## Disclaimer

This is an unnoficial tool. Feel free to fill an issue in issues tab.

## Related

[I also made another similar tool](https://github.com/willnode/uas-public-stat/)