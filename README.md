# DDai Network Auto Bot

An automated bot for interacting with the DDai Network platform, designed to complete missions and earn rewards automatically.

## Register
- Link : https://app.ddai.network/register?ref=PKC64QHq

## Features

- Automatic login with saved token
- Mission completion automation
- Continuous request loop for rewards
- Proxy support for multiple accounts
- Token refresh handling

## Prerequisites

- Node.js (v16 or higher recommended)
- npm/yarn
- Git

## Installation

1. Clone the repository:
```bash
git clone https://codeberg.org/vikitoshi/DDAI-Network.git
cd DDAI-Network
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the project root with your credentials:
```env
USERNAME=your_ddai_username
PASSWORD=your_ddai_password
```

4. (Optional) Add proxies to `proxies.txt` (one per line):
```text
http://proxy1.example.com:8080
http://proxy2.example.com:8080
```

## Usage

Run the bot:
```bash
node index.js
```

The bot will:
1. Attempt to login or use saved token
2. Complete all available missions
3. Enter an infinite loop of making requests to earn rewards

## Configuration

### Files:
- `.env` - Contains your login credentials
- `token.txt` - Automatically created to store your session token
- `proxies.txt` - Optional proxy list (one proxy per line)

### Environment Variables:
| Variable  | Description                  |
|-----------|------------------------------|
| USERNAME  | Your DDai Network username   |
| PASSWORD  | Your DDai Network password   |

## Proxy Support

The bot supports HTTP/HTTPS proxies. Add your proxies to `proxies.txt` with the following format:
```
http://username:password@host:port
https://host:port
```

The bot will randomly select a proxy from the list for each session.

## Logs

The bot provides color-coded logging:
- ✅ Success messages (green)
- ⚠ Warnings (yellow)
- ✗ Errors (red)
- ⟳ Loading/processing (cyan)
- ➤ Information (white)

## Troubleshooting

1. **Login Failed**:
   - Verify your credentials in `.env`
   - Check if the DDai Network service is available
   - Try without proxy if using one

2. **Token Expired**:
   - The bot should automatically handle token refresh
   - Delete `token.txt` to force a fresh login

3. **Proxy Issues**:
   - Verify your proxy is working
   - Check the proxy format in `proxies.txt`

## Disclaimer

This bot is for educational purposes only. Use at your own risk. The developers are not responsible for any account restrictions or consequences resulting from using this bot.

## License

MIT License - See [LICENSE](LICENSE) file for details.

## Support

For issues or feature requests, please open an issue on the [GitHub repository](https://github.com/airdropinsiders/DDai-Network-Auto-Bot/issues).

---

*This project is maintained by [Airdrop Insiders](https://github.com/airdropinsiders)*
```
