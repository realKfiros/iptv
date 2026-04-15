"use client";

import { observer } from "mobx-react-lite";
import styled from "styled-components";
import iptvStore from "@/stores/iptvStore";
import Player from "@/components/Player";

const Page = styled.main`
    min-height: 100vh;
    background: #0f1115;
    color: #fff;
    padding: 1rem;
`;

const Container = styled.div`
    max-width: 1400px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1rem;
`;

const Card = styled.div`
    background: #171a21;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 16px;
    padding: 1rem;
    overflow: hidden;
`;

const HeaderCard = styled(Card)`
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
`;

const MainGrid = styled.div`
    display: grid;
    grid-template-columns: minmax(0, 1.4fr) minmax(320px, 0.9fr);
    gap: 1rem;
    align-items: start;

    @media (max-width: 1100px) {
        grid-template-columns: 1fr;
    }
`;

const LeftColumn = styled.div`
    display: flex;
    flex-direction: column;
    gap: 1rem;
    min-width: 0;
`;

const RightColumn = styled.div`
    display: flex;
    flex-direction: column;
    gap: 1rem;
    min-width: 0;
`;

const Tabs = styled.div`
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
`;

const TabButton = styled.button<{ $active: boolean }>`
    border: 0;
    border-radius: 10px;
    padding: 0.7rem 0.9rem;
    cursor: pointer;
    background: ${({ $active }) => ($active ? "#2d6cdf" : "#242936")};
    color: #fff;

    &:hover {
        opacity: 0.92;
    }
`;

const Input = styled.input`
    width: 100%;
    padding: 0.85rem 1rem;
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: #0f1115;
    color: #fff;
`;

const Button = styled.button`
    border: 0;
    border-radius: 10px;
    padding: 0.85rem 1rem;
    cursor: pointer;
    background: #2d6cdf;
    color: #fff;
    font-weight: 600;

    &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }
`;

const FieldGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
`;

const PlayerWrap = styled.div`
    aspect-ratio: 16 / 9;
    min-height: 320px;
    background: #000;
    border-radius: 14px;
    overflow: hidden;
`;

const ErrorText = styled.p`
    color: #ff7b7b;
    margin: 0.75rem 0 0 0;
`;

const Empty = styled.div`
    display: grid;
    place-items: center;
    min-height: 320px;
    border-radius: 16px;
    background: #171a21;
    border: 1px solid rgba(255, 255, 255, 0.08);
`;

const CategorySearchInput = styled.input`
	width: 100%;
	padding: 0.8rem 0.95rem;
	border-radius: 10px;
	border: 1px solid rgba(255, 255, 255, 0.1);
	background: #0f1115;
	color: #fff;
	margin-bottom: 0.75rem;
`;

const CategoryList = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
`;

const CategoryButton = styled.button<{ $active: boolean }>`
    border: 0;
    border-radius: 999px;
    padding: 0.55rem 0.85rem;
    cursor: pointer;
    background: ${({ $active }) => ($active ? "#2d6cdf" : "#242936")};
    color: #fff;
`;

const SearchInput = styled.input`
	width: 100%;
	padding: 0.8rem 0.95rem;
	border-radius: 10px;
	border: 1px solid rgba(255, 255, 255, 0.1);
	background: #0f1115;
	color: #fff;
	margin-top: 0.75rem;
`;

const ChannelsCard = styled(Card)`
	padding: 0;
`;

const ChannelsHeader = styled.div`
	padding: 1rem 1rem 0.75rem 1rem;
	border-bottom: 1px solid rgba(255, 255, 255, 0.06);
`;

const ChannelList = styled.div`
	display: flex;
	flex-direction: column;
	max-height: 70vh;
	overflow: auto;
	padding: 0.75rem;

	@media (max-width: 1100px) {
		max-height: 45vh;
	}
`;

const ChannelButton = styled.button<{ $active: boolean }>`
	width: 100%;
	text-align: left;
	border: 1px solid ${({ $active }) => ($active ? "#2d6cdf" : "rgba(255,255,255,0.08)")};
	border-radius: 12px;
	padding: 0.85rem;
	cursor: pointer;
	background: ${({ $active }) => ($active ? "rgba(45,108,223,0.2)" : "#171a21")};
	color: #fff;
	margin-bottom: 0.5rem;

	&:last-child {
		margin-bottom: 0;
	}
`;

const ChannelName = styled.div`
	font-weight: 600;
`;

const ChannelMeta = styled.small`
	opacity: 0.7;
`;

const PlaylistForm = observer(() => {
	return (
		<FieldGroup>
			<Input
				placeholder="https://example.com/playlist.m3u"
				value={iptvStore.playlistUrl}
				onChange={(event) => iptvStore.setPlaylistUrl(event.target.value)}
			/>
			<Button onClick={iptvStore.loadFromPlaylistUrl} disabled={iptvStore.loading}>
				{iptvStore.loading ? "Loading..." : "Load Playlist"}
			</Button>
		</FieldGroup>
	);
});

const XtreamForm = observer(() => {
	return (
		<FieldGroup>
			<Input
				placeholder="https://server.example.com"
				value={iptvStore.xtreamCredentials.server}
				onChange={(event) => iptvStore.setXtreamField("server", event.target.value)}
			/>
			<Input
				placeholder="Username"
				value={iptvStore.xtreamCredentials.username}
				onChange={(event) => iptvStore.setXtreamField("username", event.target.value)}
			/>
			<Input
				type="password"
				placeholder="Password"
				value={iptvStore.xtreamCredentials.password}
				onChange={(event) => iptvStore.setXtreamField("password", event.target.value)}
			/>
			<Button onClick={iptvStore.loadFromXtream} disabled={iptvStore.loading}>
				{iptvStore.loading ? "Logging in..." : "Login with Xtream"}
			</Button>
		</FieldGroup>
	);
});

const HomePage = observer(function HomePage() {
	return (
		<Page>
			<Container>
				<HeaderCard>
					<h1 style={{ margin: 0 }}>IPTV Player</h1>
					<p style={{ margin: 0, opacity: 0.75 }}>
						Load a playlist or login with Xtream, then pick a channel.
					</p>
				</HeaderCard>

				<MainGrid>
					<LeftColumn>
						{iptvStore.selectedChannel ? (
							<Card>
								<h2 style={{ marginTop: 0 }}>{iptvStore.selectedChannel.name}</h2>
								<PlayerWrap>
									<Player src={iptvStore.selectedChannel.streamUrl} />
								</PlayerWrap>
							</Card>
						) : (
							<Empty>Select a playlist and choose a channel.</Empty>
						)}

						<Card>
							<Tabs>
								<TabButton
									$active={iptvStore.sourceType === "playlist"}
									onClick={() => iptvStore.setSourceType("playlist")}>
									Playlist
								</TabButton>

								<TabButton
									$active={iptvStore.sourceType === "xtream"}
									onClick={() => iptvStore.setSourceType("xtream")}>
									Xtream
								</TabButton>
							</Tabs>

							{iptvStore.sourceType === "playlist" ? <PlaylistForm /> : <XtreamForm />}

							{iptvStore.error ? <ErrorText>{iptvStore.error}</ErrorText> : null}
						</Card>
					</LeftColumn>

					<RightColumn>
						<Card>
							<CategorySearchInput
								placeholder="Search categories..."
								value={iptvStore.categorySearch}
								onChange={(event) => iptvStore.setCategorySearch(event.target.value)}
							/>

							<CategoryList>
								{iptvStore.visibleCategories.map((category) => (
									<CategoryButton
										key={category.id}
										$active={iptvStore.selectedCategoryId === category.id}
										onClick={() => iptvStore.setSelectedCategoryId(category.id)}
									>
										{category.name}
									</CategoryButton>
								))}
							</CategoryList>

							<SearchInput
								placeholder="Search channels..."
								value={iptvStore.search}
								onChange={(event) => iptvStore.setSearch(event.target.value)}
							/>
						</Card>

						<ChannelsCard>
							<ChannelsHeader>
								<p style={{ margin: 0, opacity: 0.7 }}>
									{iptvStore.filteredChannels.length} channels
								</p>
							</ChannelsHeader>

							<ChannelList>
								{iptvStore.filteredChannels.map((channel) => (
									<ChannelButton
										key={channel.id}
										$active={iptvStore.selectedChannel?.id === channel.id}
										onClick={() => iptvStore.selectChannel(channel)}
									>
										<ChannelName>{channel.name}</ChannelName>
										{channel.categoryName ? (
											<ChannelMeta>{channel.categoryName}</ChannelMeta>
										) : null}
									</ChannelButton>
								))}
							</ChannelList>
						</ChannelsCard>
					</RightColumn>
				</MainGrid>
			</Container>
		</Page>
	);
});

export default HomePage;