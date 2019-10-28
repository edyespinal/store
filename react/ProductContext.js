import PropTypes from 'prop-types'
import React, { useEffect, useMemo } from 'react'
import { useApolloClient, useQuery } from 'react-apollo'
import { isEmpty } from 'ramda'
import { useRuntime } from 'vtex.render-runtime'

import {
  product as productQuery,
  productPreviewFragment,
  productBenefits,
  UNSTABLE__productCategoryTree as productCategoryTree,
} from 'vtex.store-resources/Queries'

function useNotFound(loading, propsProduct, slug) {
  const { navigate } = useRuntime()

  useEffect(() => {
    if (!propsProduct && !loading) {
      navigate({
        page: 'store.search',
        params: { term: slug },
        query: `productLinkNotFound=${slug}`,
      })
    }
  }, [loading, propsProduct, navigate, slug])
}

const useProductQueries = params => {
  const client = useApolloClient()
  const {
    loading: catalogLoading,
    data: { product: catalogProduct } = {},
    refetch,
  } = useQuery(productQuery, {
    variables: {
      slug: params.slug,
      skipCategoryTree: true,
      identifier: {
        field: 'id',
        value: params.id || '',
      },
    },
    errorPolicy: 'all',
    displayName: 'ProductQuery',
  })

  const {
    data: { product: categoryTreeProduct } = {},
    loading: categoryTreeLoading,
  } = useQuery(productCategoryTree, {
    variables: {
      slug: params.slug,
      identifier: {
        field: 'id',
        value: params.id || '',
      },
    },
    errorPolicy: 'all',
    ssr: false,
    displayName: 'ProductCategoryTreeQuery',
  })

  const {
    loading: benefitsLoading,
    data: { product: benefitsProduct } = {},
  } = useQuery(productBenefits, {
    variables: {
      slug: params.slug,
      identifier: {
        field: 'id',
        value: params.id || '',
      },
    },
    errorPolicy: 'all',
    ssr: false,
    displayName: 'ProductBenefitsQuery',
  })

  const loading = catalogLoading || benefitsLoading
  const validProducts = [
    catalogLoading ? null : catalogProduct,
    categoryTreeLoading ? null : categoryTreeProduct,
    benefitsLoading ? null : benefitsProduct,
  ].filter(maybeProduct => maybeProduct && !isEmpty(maybeProduct))

  const product = catalogLoading
    ? null
    : validProducts.reduce((acc, product) => ({ ...acc, ...product }), {})

  let productFragment = null

  if (!product) {
    try {
      productFragment = client.readFragment({
        id: `Product:${params.slug}`,
        fragment: productPreviewFragment,
      })
    } catch (e) {
      //do nothing
      productFragment = null
    }
  }

  return {
    product: product || productFragment,
    loading,
    refetch,
  }
}

const ProductContext = ({ params, params: { slug }, children }) => {
  const { loading, product, refetch } = useProductQueries(params)

  useNotFound(loading, product, slug)

  const productQuery = useMemo(
    () => ({
      loading,
      product,
      refetch,
      error:
        !product && !loading
          ? {
              message: 'Product not found!',
            }
          : null,
    }),
    [loading, product, refetch]
  )

  const childrenProps = useMemo(
    () => ({
      productQuery,
      slug,
      params,
    }),
    [productQuery, slug, params]
  )

  return React.cloneElement(children, childrenProps)
}

ProductContext.propTypes = {
  params: PropTypes.object,
  query: PropTypes.shape({
    skuId: PropTypes.string,
  }),
  data: PropTypes.object,
  children: PropTypes.node,
  catalog: PropTypes.object,
  productBenefits: PropTypes.object,
}

export default ProductContext
