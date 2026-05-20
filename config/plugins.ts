export default ({ env }) => ({
	'cloudinary-media-library': {
		enabled: true,
		config: {
			cloudName: env('CLOUDINARY_CLOUD_NAME'),
			apiKey: env('CLOUDINARY_API_KEY'),
			encryptionKey: env('CLOUDINARY_ENCRYPTION_KEY'),
		},
	},
	upload: {
		config: {
			provider: '@strapi/provider-upload-cloudinary',
			providerOptions: {
				cloud_name: env('CLOUDINARY_CLOUD_NAME'),
				api_key: env('CLOUDINARY_API_KEY'),
				api_secret: env('CLOUDINARY_ENCRYPTION_KEY'),
			},
			actionOptions: {
				upload: {
					folder: 'krishna-poshak',
				},
				delete: {},
			},
			// Disable ALL local image processing to avoid Windows temp file issues
			sizeOptimization: false,
			responsiveDimensions: false,
			breakpoints: {},
		},
	},
});